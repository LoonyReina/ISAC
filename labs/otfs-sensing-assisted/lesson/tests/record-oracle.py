#!/usr/bin/env python3
"""Independently check a downloaded production lesson record; no Node or fixture lookup.

Usage: python3 record-oracle.py downloaded.json [--reference /path/reference.py]
Requires NumPy and the frozen reference.py with the SHA-256 printed below. In a
repository checkout the reference is found automatically. JSON is written to
stdout. Exit 0 means numerical parity within declared tolerances, NOT source
authenticity or browser verification. Localized categorical half-tie differences
are retained explicitly; their unknown per-iteration JS labels are not claimed
independently established. Unsupported exception causes exit 2 (not verified).
"""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import sys
import numpy as np

MAX_BYTES = 8 * 1024 * 1024
REFERENCE_SHA = 'c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce'
PROVENANCE = dict(source='https://arxiv.org/pdf/2105.03125v2', sourceVersion='2105.03125v2', sourcePdfSha256='57e8c349ee32452bd53d42625da4295c6e4014ca1c2e52bb17584fea40ce1f98', runtimeVersion='v3', manifestSha256='352370b7ba1046e748b6d4e0ec6cde296ccf37d060da56a2ca079249ef491de6', runtimeManifestSha256='5a51d315a6f33b352149cc388bcb72edda1a22876cacd89a375b5b1337127a7e', referenceSha256=REFERENCE_SHA)
MODES = ['moment_repaired', 'ignored_uncertainty', 'literal_operational', 'supplied_perfect_csi']
DTYPES = {'Float64Array': np.float64, 'Int8Array': np.int8, 'Uint8Array': np.uint8, 'Int32Array': np.int32}
BASE_RESULT = ['probabilities', 'probabilitiesValidMask', 'knownPilotFlatIndex', 'knownPilotValue', 'decisions', 'status', 'iterations', 'history', 'dataMask', 'gainVariance']
HISTORY = {'iteration': 'iteration', 'max_message_change': 'maxMessageChange', 'max_marginal_change': 'maxMarginalChange', 'decision_changes': 'decisionChanges', 'mean_entropy_bits': 'meanEntropyBits', 'plugin_residual_mse': 'pluginResidualMse'}
REPORT = {'numericalParity': False, 'sourceAuthenticity': 'not-verified', 'realBrowserVerification': 'not-run', 'referenceSha256': REFERENCE_SHA, 'numericValuesCompared': 0, 'maximumAbsoluteError': 0.0, 'receiverRecords': 0, 'retainedFailures': [], 'categoricalDifferences': [], 'unverifiedFailures': []}


def need(ok, message):
    if not ok:
        raise ValueError(message)


def strict(obj, names, label):
    need(type(obj) is dict and set(obj) == set(names), label + ': unknown/missing fields')


def no_duplicates(items):
    out = {}
    for k, v in items:
        need(k not in out and k not in ('__proto__', 'constructor', 'prototype'), 'Duplicate/unsafe JSON key: ' + k)
        out[k] = v
    return out


def load_json(text):
    return json.loads(text, object_pairs_hook=no_duplicates, parse_constant=lambda x: (_ for _ in ()).throw(ValueError('Nonfinite JSON: ' + x)))


def number(x, label, lo=-sys.float_info.max, hi=sys.float_info.max, integer=False):
    need(type(x) in (int, float) and math.isfinite(x) and lo <= x <= hi and (not integer or int(x) == x), label + ': invalid finite number')
    return x


def close(actual, expected, label, exact=False):
    if isinstance(expected, dict):
        strict(actual, expected, label)
        for k, v in expected.items():
            close(actual[k], v, label + '.' + k, exact)
    elif isinstance(expected, (list, tuple, np.ndarray)):
        need(isinstance(actual, (list, np.ndarray)) and len(actual) == len(expected), label + ': wrong array length')
        for j, v in enumerate(expected):
            close(actual[j], v.item() if isinstance(v, np.generic) else v, f'{label}[{j}]', exact)
    elif expected is None or type(expected) in (str, bool):
        need(type(actual) == type(expected) and actual == expected, label + ': unequal value')
    elif isinstance(expected, (int, float, np.number)):
        need(isinstance(actual, (int, float, np.number)) and not isinstance(actual, (bool, np.bool_)) and np.isfinite(actual), label + ': nonfinite/nonnumeric')
        difference = abs(float(actual) - float(expected))
        tolerance = 0 if exact or type(expected) is int else 3e-12 + 2e-11 * abs(float(expected))
        need(difference <= tolerance, f'{label}: {actual!r} != {expected!r}, delta={difference}')
        REPORT['numericValuesCompared'] += 1
        REPORT['maximumAbsoluteError'] = max(REPORT['maximumAbsoluteError'], difference)
    else:
        raise ValueError(label + ': unsupported expected type')


def typed(x, dtype, length, label):
    need(isinstance(x, np.ndarray) and x.dtype == np.dtype(dtype) and x.shape == (length,) and np.all(np.isfinite(x)), label + ': invalid dtype/shape/value')


def decode(value):
    nodes = 0
    def walk(x, depth=0):
        nonlocal nodes
        nodes += 1
        need(nodes <= 500000 and depth <= 32, 'Codec budget exceeded')
        if x is None or type(x) in (str, bool):
            return x
        if type(x) in (float, int):
            return number(x, 'codec number')
        if type(x) is list:
            return [walk(y, depth + 1) for y in x]
        need(type(x) is dict, 'Unsupported codec value')
        if '$number' in x:
            need(x == {'$number': '-0'}, 'Malformed signed-zero tag')
            return -0.0
        if '$typed' in x:
            strict(x, ['$typed', 'values'], 'Typed tag')
            need(x['$typed'] in DTYPES and type(x['values']) is list and len(x['values']) <= 10000, 'Invalid typed tag')
            values = [walk(y, depth + 1) for y in x['values']]
            for v in values:
                number(v, 'typed element')
            dtype = DTYPES[x['$typed']]
            if dtype != np.float64:
                limit = np.iinfo(dtype)
                for v in values:
                    need(limit.min <= v <= limit.max and int(v) == v and not (v == 0 and math.copysign(1, v) < 0), 'Lossy integer typed conversion')
            return np.array(values, dtype=dtype)
        return {k: walk(v, depth + 1) for k, v in x.items()}
    return walk(value)


def unpack(envelope, label):
    strict(envelope, ['text', 'sha256', 'bytes'], label)
    need(type(envelope['text']) is str, label + ': text required')
    data = envelope['text'].encode('utf-8')
    need(len(data) <= MAX_BYTES and len(data) == envelope['bytes'], label + ': invalid byte count')
    need(hashlib.sha256(data).hexdigest() == envelope['sha256'], label + ': invalid hash')
    wire = load_json(envelope['text'])
    strict(wire, ['codec', 'value'], label + ' codec')
    need(wire['codec'] == 'sensing-otfs-finite-typed-json-v2', 'Unsupported codec')
    return decode(wire['value'])


def pair(x, label, lo, hi, integer=False):
    need(type(x) is list and len(x) == 2, label + ': expected pair')
    for y in x:
        number(y, label, lo, hi, integer)


def config(c, operation):
    run = ['shape', 'physicalSupport', 'predictedSupport', 'priorPowers', 'pilotIndex', 'pilotPowerRatio', 'pilotPhase', 'dataEnergy', 'N0', 'normalizations', 'seed', 'frames', 'modes', 'maxIterations', 'damping', 'tolerance']
    receive = ['shape', 'support', 'y', 'pilotIndex', 'pilot', 'Es', 'N0', 'priorPowers', 'mode', 'maxIterations', 'damping', 'tolerance']
    strict(c, run if operation == 'run' else receive, 'input')
    pair(c['shape'], 'shape', 1, 16, True)
    L = math.prod(c['shape'])
    need(2 <= L <= 256, 'Invalid grid size')
    supports = ['physicalSupport', 'predictedSupport'] if operation == 'run' else ['support']
    P = len(c[supports[0]])
    need(1 <= P <= 3, 'Invalid path count')
    for key in supports:
        need(type(c[key]) is list and len(c[key]) == P, 'Invalid support count')
        for s in c[key]:
            pair(s, key, 0, 15, True)
            need(all(s[d] < c['shape'][d] for d in (0, 1)), 'Noncanonical modulo support')
        need(len({tuple(s) for s in c[key]}) == P, 'Duplicate support')
    pair(c['pilotIndex'], 'pilotIndex', 0, 15, True)
    need(all(c['pilotIndex'][d] < c['shape'][d] for d in (0, 1)), 'Pilot outside grid')
    need(type(c['priorPowers']) is list and len(c['priorPowers']) == P, 'Prior count')
    for p in c['priorPowers']:
        number(p, 'prior power', 0, 1e6)
    number(c['N0'], 'N0', 1e-12, 1e12)
    number(c['maxIterations'], 'maxIterations', 1, 40, True)
    number(c['damping'], 'damping', np.finfo(float).eps, 1)
    number(c['tolerance'], 'tolerance', 0, 1)
    if operation == 'run':
        number(c['seed'], 'seed', 0, 0xffffffff, True)
        number(c['frames'], 'frames', 1, 2, True)
        number(c['pilotPowerRatio'], 'pilotPowerRatio', 1e-6, 1e6)
        number(c['pilotPhase'], 'pilotPhase', -math.pi, math.pi)
        number(c['dataEnergy'], 'dataEnergy', 1e-6, 1e6)
        need(type(c['normalizations']) is list and 1 <= len(c['normalizations']) <= 2 and len(set(c['normalizations'])) == len(c['normalizations']) and all(n in ['source_per_data', 'equal_total_frame'] for n in c['normalizations']), 'Invalid normalizations')
        need(type(c['modes']) is list and 1 <= len(c['modes']) <= 4 and len(set(c['modes'])) == len(c['modes']) and all(m in MODES for m in c['modes']), 'Invalid modes')
        for norm in c['normalizations']:
            Es = c['dataEnergy'] if norm == 'source_per_data' else L*c['dataEnergy']/(L-1+c['pilotPowerRatio'])
            number(Es, 'derived Es', 1e-12, 1e12)
            number(Es*c['pilotPowerRatio'], 'derived Ep', 1e-12, 1e12)
    else:
        typed(c['y'], np.float64, 2*L, 'input y')
        need(np.max(abs(c['y'])) <= 1e12, 'Raw y bound')
        pair(c['pilot'], 'pilot', -1e6, 1e6)
        number(sum(p*p for p in c['pilot']), 'pilot energy', 1e-12, 1e12)
        number(c['Es'], 'Es', 1e-12, 1e12)
        need(c['mode'] in MODES[:3], 'Unknown practical mode')
    return L, P


class RNG:
    def __init__(self, seed):
        self.state, self.spare = seed, None
    def uniform(self):
        self.state = (self.state + 0x6D2B79F5) & 0xffffffff
        t = ((self.state ^ (self.state >> 15)) * (self.state | 1)) & 0xffffffff
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) + .5) / 4294967296
    def normal(self):
        if self.spare is not None:
            v, self.spare = self.spare, None
            return v
        radius = math.sqrt(-2*math.log(self.uniform()))
        angle = 2*math.pi*self.uniform()
        self.spare = radius*math.sin(angle)
        return radius*math.cos(angle)


def complex_array(x):
    return np.asarray(x)[::2] + 1j*np.asarray(x)[1::2]


def packed(x):
    x = np.asarray(x, complex).ravel()
    out = np.empty(2*len(x))
    out[::2], out[1::2] = x.real, x.imag
    return out


def conditioning_probe(args):
    """Independent scalar flooding implementation of the v3 resolution diagnostic.
    This does not replace the reference or returned probabilities with an LLR.
    It only establishes whether a reported NUMERICAL_CONDITIONING failure is
    reproducible from the raw input; arbitrary exception text is never accepted.
    """
    y, support, a = args['y'], args['support'], args['estimated_gains']
    N, M = y.shape
    L, P = N*M, len(support)
    q = args['pilot_index'][0]*M + args['pilot_index'][1]
    pilot, Es, N0, mode = args['pilot'], args['Es'], args['N0'], args['mode']
    v = np.asarray(args['gain_variance']).copy()
    if mode == 'ignored_uncertainty':
        v[:] = 0
    elif mode == 'literal_operational':
        v[:] = (P*Es+N0)/(pilot.real**2+pilot.imag**2)
    idx = [[((r//M-s[0]) % N)*M + ((r%M-s[1]) % M) for s in support] for r in range(L)]
    incoming = np.full((L, P, 2), .5)
    chi = math.sqrt(Es)
    def norm(log0, log1):
        m = max(log0, log1)
        x, z = math.exp(log0-m), math.exp(log1-m)
        return [x/(x+z), z/(x+z)]
    for iteration in range(1, args['max_iterations']+1):
        means, second, symvar = {}, {}, {}
        for r in range(L):
            for p in range(P):
                mean = pilot if idx[r][p] == q else complex(-chi*incoming[r,p,0]+chi*incoming[r,p,1], 0)
                means[r,p] = mean
                second[r,p] = pilot.real**2+pilot.imag**2 if idx[r][p] == q else Es
                symvar[r,p] = max(0, second[r,p]-math.hypot(mean.real, mean.imag)**2)
        f2v = np.empty((L,P,2))
        for p in range(P):
            for r in range(L):
                if idx[r][p] == q:
                    probs = [.5,.5]
                else:
                    if mode == 'literal_operational':
                        mu = means[r,p]*(sum(a)-a[p])
                        V = max(N0, N0+Es*(v[p]*(P-1)+sum((math.hypot(a[j].real,a[j].imag)**2+v[p])*symvar[r,j] for j in range(P))-(math.hypot(a[p].real,a[p].imag)**2+v[p])*symvar[r,p]))
                    else:
                        mu = sum(a[j]*means[r,j] for j in range(P))-a[p]*means[r,p]
                        V = max(N0,N0+sum(math.hypot(a[j].real,a[j].imag)**2*symvar[r,j]+v[j]*second[r,j] for j in range(P))-(math.hypot(a[p].real,a[p].imag)**2*symvar[r,p]+v[p]*second[r,p])+v[p]*chi*chi)
                    rr = y.ravel()[r]-mu
                    r0, r1 = rr+a[p]*chi, rr-a[p]*chi
                    probs = norm(-math.hypot(r0.real,r0.imag)**2/V-math.log(V),-math.hypot(r1.real,r1.imag)**2/V-math.log(V))
                    llr = 4*chi*(rr.real*a[p].real+rr.imag*a[p].imag)/V
                    positive = 1/(1+math.exp(-llr)) if llr >= 0 else math.exp(llr)/(1+math.exp(llr))
                    if not math.isfinite(llr) or abs(probs[1]-positive)>1e-9:
                        return {'iteration':iteration,'observation':r,'path':p,'distanceProbability':probs[1],'diagnosticProbability':positive}
                f2v[r,p] = [math.log(max(z,1e-300)) for z in probs]
        total = np.zeros((L,2))
        for r in range(L):
            for p in range(P):
                total[idx[r][p]] += f2v[r,p]
        for r in range(L):
            for p in range(P):
                proposal=norm(*(total[idx[r][p]]-f2v[r,p]))
                incoming[r,p] = args['damping']*np.array(proposal)+(1-args['damping'])*incoming[r,p]
    return None


def decoder(reference, rec, args, label, evaluation=False, source=None, mode=None):
    exception = rec.get('status') == 'exception_failure'
    extras = ['mode','extraInformationOracle','metrics'] if evaluation else ['estimatedGains','receiverInputPolicy']
    strict(rec, BASE_RESULT + extras + (['exception','numericalFailureCode'] if exception else []), label)
    L, P = args['y'].size, len(args['support'])
    q = args['pilot_index'][0]*args['y'].shape[1]+args['pilot_index'][1]
    mask = np.ones(L,dtype=np.uint8);mask[q]=0
    for key in ['probabilities','decisions']:
        typed(rec[key], np.float64, 2*L, label+'.'+key)
    for key in ['dataMask','probabilitiesValidMask']:
        typed(rec[key], np.uint8, L, label+'.'+key);close(rec[key],mask,label+'.'+key,True)
    typed(rec['gainVariance'],np.float64,P,label+'.gainVariance')
    close(rec['knownPilotFlatIndex'],q,label+'.knownPilotFlatIndex',True)
    close(rec['knownPilotValue'],[args['pilot'].real,args['pilot'].imag],label+'.knownPilotValue')
    probability=rec['probabilities'].reshape(L,2)
    need(np.all((probability>=0)&(probability<=1)) and np.max(abs(probability.sum(axis=1)-1))<=2e-15,label+': invalid probabilities')
    close(probability[q],[.5,.5],label+'.pilotProbability',True)
    actual_labels=(probability[:,1]>probability[:,0]).astype(int)
    decisions=np.where(actual_labels,math.sqrt(args['Es']),-math.sqrt(args['Es'])).astype(complex);decisions[q]=args['pilot']
    close(rec['decisions'],packed(decisions),label+'.decisionsFromProbabilities')
    if evaluation:
        close(rec['mode'],mode,label+'.mode')
        close(rec['extraInformationOracle'],mode=='supplied_perfect_csi',label+'.extraInformationOracle')
    else:
        typed(rec['estimatedGains'],np.float64,2*P,label+'.estimatedGains')
        close(rec['estimatedGains'],packed(args['estimated_gains']),label+'.estimatedGains')
        need(rec['receiverInputPolicy'] in ['raw y + predicted support/pilot/statistical powers only','raw y + declared predicted support/pilot/powers only; no current truth'],label+': invalid practical policy')
    if exception:
        close(rec['iterations'],0,label+'.iterations',True);close(rec['history'],[],label+'.history');close(rec['probabilities'],np.full(2*L,.5),label+'.fallbackProbability',True)
        close(rec['gainVariance'],args['gain_variance'],label+'.fallbackInputVariance')
        need(type(rec['exception']) is str and len(rec['exception'])<=1000,label+': invalid exception')
        if rec['numericalFailureCode']=='NUMERICAL_CONDITIONING':
            probe=conditioning_probe(args)
            need(probe is not None,label+': claimed conditioning failure not independently reproduced')
            close(rec['exception'],'Candidate likelihood is numerically unresolved in the declared Float64 distance arithmetic',label+'.exception')
            REPORT['retainedFailures'].append({'record':label,'code':'NUMERICAL_CONDITIONING','independentProbe':probe})
        else:
            REPORT['unverifiedFailures'].append({'record':label,'code':rec['numericalFailureCode'],'reason':'Failure fallback/denominators retained, but an arbitrary runtime exception cannot be independently established from numerical evidence'})
    else:
        expected=reference.sparse_spa(**args)
        close(rec['probabilities'],expected['probabilities'].ravel(),label+'.probabilities')
        close(rec['gainVariance'],expected['gain_variance'],label+'.gainVariance')
        close(rec['status'],expected['status'],label+'.status')
        close(rec['iterations'],expected['iterations'],label+'.iterations',True)
        need(type(rec['history']) is list and len(rec['history'])==len(expected['history']),label+': invalid history count')
        expected_labels=np.argmax(expected['probabilities'],axis=1)
        different=np.flatnonzero((actual_labels!=expected_labels)&mask.astype(bool))
        for t in different:
            need(max(abs(probability[t]-.5))<=3e-12 and max(abs(expected['probabilities'][t]-.5))<=3e-12,label+': non-tie hard-decision mismatch')
            REPORT['categoricalDifferences'].append({'record':label,'field':'decision','cell':int(t),'actual':int(actual_labels[t]),'reference':int(expected_labels[t]),'actualPPlus':float(probability[t,1]),'referencePPlus':float(expected['probabilities'][t,1]),'classification':'retained-cross-language-half-tie'})
        for j,(actual,row) in enumerate(zip(rec['history'],expected['history'])):
            strict(actual,HISTORY.values(),label+'.history')
            for old,new in HISTORY.items():
                if new!='decisionChanges' or actual[new]==row[old]:
                    close(actual[new],row[old],f'{label}.history[{j}].{new}')
                    continue
                # The production record stores summaries, not historical marginals.
                # Localize the discrepancy without inventing the missing JS labels.
                current=reference.sparse_spa(**{**args,'max_iterations':j+1,'tolerance':0})['probabilities']
                previous=reference.sparse_spa(**{**args,'max_iterations':j,'tolerance':0})['probabilities'] if j else None
                current_tie=np.max(abs(current-.5),axis=1)<=3e-12
                previous_tie=np.max(abs(previous-.5),axis=1)<=3e-12 if j else np.zeros(L,dtype=bool)
                labels=np.argmax(current,axis=1);previous_labels=np.argmax(previous,axis=1) if j else np.zeros(L,dtype=int)
                uncertain=(current_tie|previous_tie)&mask.astype(bool)
                fixed=(~uncertain)&mask.astype(bool)
                minimum=int(np.sum((labels!=previous_labels)&fixed));maximum=minimum+int(np.sum(uncertain))
                number(actual[new],label+'.decisionChanges',0,L-1,True)
                need(minimum<=actual[new]<=maximum and np.any(uncertain),label+': history count mismatch outside localized half ties')
                REPORT['categoricalDifferences'].append({'record':label,'field':'history.decisionChanges','iteration':j+1,'actual':actual[new],'reference':row[old],'halfTieCells':np.flatnonzero(uncertain).tolist(),'classification':'compatible-with-half-tie-but-actual-historical-labels-not-exported','independentlyVerified':False})
    if evaluation:
        bits=L-1;failed=rec['status'] in ['exception_failure','nonfinite_failure']
        errors=bits if failed else int(np.sum(complex_array(rec['decisions'])[mask.astype(bool)]!=source.ravel()[mask.astype(bool)]))
        close(rec['metrics'],dict(errors=errors,bits=bits,BER=errors/bits,frameErrors=int(errors>0),frames=1,FER=int(errors>0),correctPayloadBits=bits-errors,capped=rec['status']=='iteration_cap',failureCountedConservatively=failed),label+'.metrics')
    REPORT['receiverRecords']+=1


def args_for(c,y,pilot,Es,estimated,variance,support,mode):
    return dict(y=y,support=support,estimated_gains=estimated,pilot_index=tuple(c['pilotIndex']),pilot=pilot,Es=Es,N0=c['N0'],gain_variance=variance,mode=mode,max_iterations=c['maxIterations'],damping=c['damping'],tolerance=c['tolerance'])


def validate_record(path, reference_path):
    need(path.stat().st_size<=MAX_BYTES,'File exceeds 8 MiB before read')
    data=path.read_bytes();need(len(data)<=MAX_BYTES,'File grew beyond import budget')
    root=load_json(data.decode('utf-8'))
    strict(root,['schema','canonicalPaperId','runtimePaperId','provenance','runId','parentRunId','operation','status','reason','startedAt','durationMs','execution','input','payload','counts','verificationPolicy'],'record')
    close(root['schema'],'sensing-assisted-otfs-lesson-record-v1','schema');close(root['canonicalPaperId'],'otfs-sensing-assisted-2021','canonical paper');close(root['runtimePaperId'],'paperotfs-sensing-assisted-2021','runtime paper');close(root['provenance'],PROVENANCE,'provenance')
    valid_id=lambda v:type(v) is str and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}',v) is not None and v not in ['constructor','prototype','__proto__']
    need(valid_id(root['runId']) and (root['parentRunId'] is None or valid_id(root['parentRunId']) and root['parentRunId']!=root['runId']),'Invalid run identity')
    need(root['operation'] in ['run','receive'] and root['status'] in ['complete','cancelled','superseded','error','failed','partial'],'Unknown operation/status')
    need(root['reason'] is None or type(root['reason']) is str and len(root['reason'])<=1000,'Invalid reason')
    from datetime import datetime
    need(type(root['startedAt']) is str and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z',root['startedAt']) is not None,'Invalid start time')
    datetime.fromisoformat(root['startedAt'].replace('Z','+00:00'));number(root['durationMs'],'durationMs',0,86400000)
    close(root['execution'],dict(environment='module-compatible runtime; execution environment not authenticated',durationBasis='caller elapsed monotonic milliseconds including worker scheduling and transport'),'execution')
    close(root['verificationPolicy'],dict(sourceAuthenticity='not-verified',independentNumericalReplay='not-run',history='untrusted imported history until explicit same-implementation replay',halfTies='No probability snapping or deletion. Independent cross-language categorical disagreements require per-iteration half-tie localization; all other fields remain strict.'),'verificationPolicy')
    c=unpack(root['input'],'input');out=unpack(root['payload'],'payload');L,P=config(c,root['operation'])
    need(reference_path.is_file(),'Frozen reference.py missing; supply --reference PATH')
    need(hashlib.sha256(reference_path.read_bytes()).hexdigest()==REFERENCE_SHA,'Reference source hash mismatch')
    spec=importlib.util.spec_from_file_location('production_pinned_reference',reference_path);reference=importlib.util.module_from_spec(spec);spec.loader.exec_module(reference)
    REPORT.update(recordSha256=hashlib.sha256(data).hexdigest(),payloadSha256=root['payload']['sha256'],runId=root['runId'],operation=root['operation'],terminalStatus=root['status'])
    if root['operation']=='receive':
        close(root['counts'],dict(requestedFrames=0,storedFrames=0,completedFrames=0,requestedReceiverRecords=1,completedReceiverRecords=int(out is not None),unfinished=[] if out is not None else [dict(operation='receive')]),'counts')
        if out is not None:
            y=complex_array(c['y']).reshape(c['shape']);pilot=complex(*c['pilot']);ah=reference.estimate_effective_gains(y,c['support'],c['pilotIndex'],pilot);v=reference.prior_gain_error_variance(c['priorPowers'],c['Es'],abs(pilot)**2,c['N0']);decoder(reference,out,args_for(c,y,pilot,c['Es'],ah,v,c['support'],c['mode']),'receive')
        else:
            need(root['status']!='complete','Complete terminal needs result')
    else:
        work=[dict(frame=f,normalization=n,mode=m) for f in range(c['frames']) for n in c['normalizations'] for m in c['modes']]
        if out is None:
            need(root['status']!='complete','Complete terminal needs result');frames=[]
        else:
            strict(out,['schema','configuration','notices','rng','frames','status','summary'],'run output');close(out['schema'],'sensing-assisted-otfs-live-v1','runtime schema');close(out['configuration'],c,'configuration',True);need(out['status'] in ['complete','partial','cancelled','superseded','failed'],'Invalid raw status')
            if root['status']=='complete':close(out['status'],'complete','complete raw status')
            # Frozen notices are descriptive provenance, checked separately from math.
            notices=dict(source=PROVENANCE['source'],sourceVersion='2105.03125v2',paperId='paperotfs-sensing-assisted-2021',model='coherent effective-gain integer circular-support uplink; independent proper-complex Gaussian population gains',interpretation='moment-repaired is a project interpretation; literal-operational preserves Eq.42/52/57 defects and repairs normalization only',uncertainty='diagonal independent proper-Gaussian surrogate; same-frame estimates depend on y and data, ignore cross-covariance and pseudo-covariance, and may double-use evidence',counterexample='A converged estimated-gain surrogate differs from the exact tiny physical posterior by 0.499913 in one marginal',oracle='supplied-perfect-CSI receives true physical support and effective gains; still uses approximate Gaussian messages',scope='fresh bounded single/paired frames; no reproduction of original figures, sensing predictor, fractional support, guarded/OFDM comparison, or whole paper',guardedBaseline='not included; original guard/source count discrepancy remains outside this runtime',browserEvidence='Module-compatible implementation; actual-browser acceptance is a separate gate')
            close(out['notices'],notices,'notices');close(out['rng'],'Mulberry32-open-uniform-BoxMuller-v1; independent fresh frame primitives; no per-realization gain normalization','rng')
            frames=out['frames'];need(type(frames) is list and len(frames)<=c['frames']*len(c['normalizations']),'Invalid stored frame count')
        rng=RNG(c['seed']);primitives=[]
        for f in range(c['frames']):
            signs=np.array([-1 if rng.uniform()<.5 else 1 for _ in range(L)],dtype=np.int8)
            gains=np.empty(2*P);noise=np.empty(2*L)
            for p in range(P):
                scale=math.sqrt(c['priorPowers'][p]/2);gains[2*p]=rng.normal()*scale;gains[2*p+1]=rng.normal()*scale
            for t in range(L):
                noise[2*t]=rng.normal()/math.sqrt(2);noise[2*t+1]=rng.normal()/math.sqrt(2)
            primitives.append((signs,gains,noise))
        for j,f in enumerate(frames):
            label=f'frame[{j}]';estimated='estimatedGains' in f;complete=f.get('status')=='complete'
            strict(f,['frame','normalization','Es','Ep','N0','pilot','x','y','noise','trueGainsEvaluationOnly','dataSignsEvaluationOnly','energyLedger','records','status']+(['estimatedGains','receiverGainVariance','predictedSupport','physicalSupportEvaluationOnly','gainErrorEvaluation'] if estimated else [])+(['pairedRepairedMinusIgnoredBER','pairing'] if complete else []),label)
            need(f['status'] in ['partial','complete'] and (j==len(frames)-1 or complete) and (not complete or estimated),label+': invalid completion ordering')
            frame_index=j//len(c['normalizations']);norm=c['normalizations'][j%len(c['normalizations'])];close(f['frame'],frame_index,label+'.frame',True);close(f['normalization'],norm,label+'.normalization')
            signs,gains,standard_noise=primitives[frame_index];Es=c['dataEnergy'] if norm=='source_per_data' else L*c['dataEnergy']/(L-1+c['pilotPowerRatio']);Ep=Es*c['pilotPowerRatio'];pilot=complex(math.sqrt(Ep)*math.cos(c['pilotPhase']),math.sqrt(Ep)*math.sin(c['pilotPhase']));q=c['pilotIndex'][0]*c['shape'][1]+c['pilotIndex'][1]
            rawx=np.zeros(2*L);rawx[::2]=signs*math.sqrt(Es);rawx[2*q:2*q+2]=[pilot.real,pilot.imag];noise=standard_noise*math.sqrt(c['N0']);x=complex_array(rawx).reshape(c['shape']);y=reference.raw_circular_frame(x,c['physicalSupport'],complex_array(gains),complex_array(noise).reshape(c['shape']))
            for key,expected in [('x',rawx),('y',packed(y)),('noise',noise),('trueGainsEvaluationOnly',gains)]:
                typed(f[key],np.float64,len(expected),label+'.'+key);close(f[key],expected,label+'.'+key)
            typed(f['dataSignsEvaluationOnly'],np.int8,L,label+'.signs');close(f['dataSignsEvaluationOnly'],signs,label+'.signs',True)
            for key,expected in [('Es',Es),('Ep',Ep),('N0',c['N0']),('pilot',[pilot.real,pilot.imag])]:close(f[key],expected,label+'.'+key)
            close(f['energyLedger'],dict(cellCount=L,pilotCount=1,dataCount=L-1,guardCount=0,dataEnergy=(L-1)*Es,pilotEnergy=Ep,totalFrameEnergy=(L-1)*Es+Ep,referenceBudget=L*c['dataEnergy'],noiseVariance=c['N0'],noiseReferenceUnchanged=True),label+'.energyLedger')
            need(type(f['records']) is list and len(f['records'])<=len(c['modes']) and (estimated or not f['records']),label+': invalid record count')
            if estimated:
                ah=reference.estimate_effective_gains(y,c['predictedSupport'],c['pilotIndex'],pilot);v=reference.prior_gain_error_variance(c['priorPowers'],Es,pilot.real**2+pilot.imag**2,c['N0'])
                typed(f['estimatedGains'],np.float64,2*P,label+'.estimatedGains');typed(f['receiverGainVariance'],np.float64,P,label+'.receiverGainVariance');close(f['estimatedGains'],packed(ah),label+'.estimatedGains');close(f['receiverGainVariance'],v,label+'.receiverGainVariance');close(f['predictedSupport'],c['predictedSupport'],label+'.predictedSupport',True);close(f['physicalSupportEvaluationOnly'],c['physicalSupport'],label+'.physicalSupport',True)
                se=float(np.sum(abs(ah-complex_array(gains))**2));te=float(np.sum(abs(complex_array(gains))**2));close(f['gainErrorEvaluation'],dict(squaredError=se,trueEnergy=te,NMSE=None if te==0 else se/te,warning='Under support mismatch this includes assigned missing/wrong-support bias; true gain used here only for evaluation'),label+'.gainEvaluation')
                for k,rec in enumerate(f['records']):
                    mode=c['modes'][k];oracle=mode=='supplied_perfect_csi';args=args_for(c,y,pilot,Es,complex_array(gains) if oracle else ah,np.zeros(P) if oracle else v,c['physicalSupport'] if oracle else c['predictedSupport'],'ignored_uncertainty' if oracle else mode);decoder(reference,rec,args,label+'.'+mode,True,x,mode)
            if complete:
                need(len(f['records'])==len(c['modes']),label+': completed frame omitted receiver')
                modes={rec['mode']:rec for rec in f['records']};paired=modes['moment_repaired']['metrics']['BER']-modes['ignored_uncertainty']['metrics']['BER'] if 'moment_repaired' in modes and 'ignored_uncertainty' in modes else None;close(f['pairedRepairedMinusIgnoredBER'],paired,label+'.pairedBER');close(f['pairing'],'All receiver modes use this exact raw y; practical modes share estimates/support/initialization/schedule/stopping. No statistical interval from one or two frames.',label+'.pairing')
        completed=sum(len(f['records']) for f in frames);close(root['counts'],dict(requestedFrames=c['frames']*len(c['normalizations']),storedFrames=len(frames),completedFrames=sum(f['status']=='complete' for f in frames),requestedReceiverRecords=len(work),completedReceiverRecords=completed,unfinished=work[completed:]),'counts')
        if out is not None:
            if out['status']=='complete':
                need(len(frames)==c['frames']*len(c['normalizations']) and all(f['status']=='complete' for f in frames),'Complete output has missing frames')
                close(out['summary'],dict(independentFrameDraws=c['frames'],conditionFrameCount=len(frames),receiverRecords=completed,allCappedAndFailureRecordsRetained=True,confidenceInterval=None,warning='One/two fresh frames demonstrate mechanics; not a BER curve or evidence of a universal advantage'),'summary')
            else:close(out['summary'],None,'partial summary')
    REPORT['numericalParity']=not REPORT['unverifiedFailures']
    REPORT['exactCategoricalParity']=not REPORT['categoricalDifferences']
    REPORT['allScientificFieldsIndependentlyEstablished']=REPORT['numericalParity'] and REPORT['exactCategoricalParity']
    REPORT['scope']='Independent Python PRNG/raw frame/estimator/energy/denominator reconstruction and pinned reference full probability/history replay of every retained receiver. No source authenticity, browser acceptance, missing-mode imputation, or complete-paper claim.'
    return REPORT


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record',type=Path)
    parser.add_argument('--reference',type=Path,default=None)
    options=parser.parse_args()
    try:
        reference=options.reference
        if reference is None:
            relative=Path('scripts/validation/sensing-assisted-otfs/prototype-v3/reference-copy/reference.py')
            reference=next((parent/relative for parent in Path(__file__).resolve().parents[:5] if (parent/relative).is_file()),None)
        need(reference is not None,'Frozen reference.py missing; download the pinned reference and supply --reference PATH')
        report=validate_record(options.record,reference)
        print(json.dumps(report,indent=2,allow_nan=False))
        return 0 if report['numericalParity'] else 2
    except Exception as error:
        REPORT.update(numericalParity=False,error=f'{type(error).__name__}: {error}')
        print(json.dumps(REPORT,indent=2,allow_nan=False))
        return 1


if __name__=='__main__':
    sys.exit(main())
