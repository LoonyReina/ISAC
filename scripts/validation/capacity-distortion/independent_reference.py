"""Independent numerical oracle; deliberately contains no BA iteration.
Pinned paper: https://arxiv.org/pdf/1805.05713v1
SciPy constrained optimization, direct channel mutual information, and quadrature.
"""
import json, math, pathlib
import numpy as np
from scipy.optimize import minimize, minimize_scalar, root
from scipy.integrate import quad
from scipy.special import roots_hermitenorm, erfc

LN2 = math.log(2)

def rate_nats(p, ps, wy):
    # wy[s,x,y], receiver knows s
    p=np.asarray(p); ps=np.asarray(ps); wy=np.asarray(wy)
    r=np.einsum('x,sxy->sy',p,wy)
    value=0.
    for s in range(len(ps)):
        for x in range(len(p)):
            for y in range(wy.shape[2]):
                if p[x]*ps[s]*wy[s,x,y] > 0:
                    value += ps[s]*p[x]*wy[s,x,y]*math.log(wy[s,x,y]/r[s,y])
    return value

def bayes_cost(ps,vz,loss):
    # vz[s,x,z], loss[s,h]; robust unnormalized Bayes risk
    risk=np.einsum('s,sxz,sh->xzh',ps,vz,loss)
    return np.min(risk,axis=2).sum(axis=1),np.argmin(risk,axis=2)

def optimize(ps,wy,c,b,B,mu,D=None):
    n=len(c); c=np.asarray(c); b=np.asarray(b)
    constraints=[{'type':'eq','fun':lambda p: p.sum()-1},
                 {'type':'ineq','fun':lambda p: B-b@p}]
    if D is not None: constraints.append({'type':'ineq','fun':lambda p:D-c@p})
    objective=lambda p: -(rate_nats(p,ps,wy)-mu*(c@p))
    starts=[np.ones(n)/n]+list(np.eye(n))
    results=[minimize(objective,p,method='SLSQP',bounds=[(0,1)]*n,
                      constraints=constraints,options={'ftol':1e-13,'maxiter':2000}) for p in starts]
    feasible=[r for r in results if abs(r.x.sum()-1)<1e-8 and b@r.x<=B+1e-8 and (D is None or c@r.x<=D+1e-8)]
    if not feasible: raise RuntimeError([r.message for r in results])
    r=min(feasible,key=lambda r:r.fun); p=r.x
    # Independent KKT-root refinement for strictly positive generic channels.
    if np.all(np.asarray(wy)>0) and D is None:
        w=np.asarray(wy); sw=np.asarray(ps); support=np.where(p>1e-7)[0]
        active=abs(b@p-B)<1e-7 and len(set(b[support]))>1
        def divergences(pp):
            out=np.einsum('x,sxy->sy',pp,w)
            return np.einsum('s,sxy->x',sw,w*np.log(w/out[:,None,:]))
        def equations(z):
            pp=np.zeros(n); pp[support]=z[:len(support)]
            lam=z[-1] if active else 0.
            a=divergences(pp)-mu*c-lam*b
            out=[pp.sum()-1]+[a[x]-a[support[-1]] for x in support[:-1]]
            if active: out.append(b@pp-B)
            return out
        initial=list(p[support])+([certificate(p,ps,wy,c,b,B,mu)['lambda_nats']] if active else [])
        rr=root(equations,initial,tol=1e-11)
        pp=np.zeros(n);pp[support]=rr.x[:len(support)]
        if rr.success and min(pp)>=-1e-12 and b@pp<=B+1e-10 and abs(pp.sum()-1)<1e-10:
            p=pp
    return {'p':p.tolist(),'rate_bits':rate_nats(p,ps,wy)/LN2,'distortion':float(c@p),
            'cost':float(b@p),'penalized_nats':float(-objective(p)),'success':bool(r.success),
            'optimizer': 'SLSQP multiple starts; generic positive channels refined by independent KKT root solve'}

def certificate(p,ps,wy,c,b,B,mu):
    # Minimize piecewise-linear upper bound over lambda independently of SLSQP.
    p=np.asarray(p); wy=np.asarray(wy); b=np.asarray(b); c=np.asarray(c)
    out=np.einsum('x,sxy->sy',p,wy); dx=np.zeros(len(p))
    for s in range(len(ps)):
        for x in range(len(p)):
            for y in range(wy.shape[2]):
                if ps[s]*wy[s,x,y]>0: dx[x]+=ps[s]*wy[s,x,y]*math.log(wy[s,x,y]/out[s,y])
    a=dx-mu*c; candidates=[0.]
    for i in range(len(p)):
        for j in range(i):
            if b[i]!=b[j]:
                lam=(a[i]-a[j])/(b[i]-b[j])
                if lam>=0: candidates.append(float(lam))
    upper=lambda lam: lam*B+float(np.max(a-lam*b))
    lam=min(candidates,key=upper)
    lower=rate_nats(p,ps,wy)-mu*(c@p)
    return {'lambda_nats':lam,'upper_nats':upper(lam),'lower_nats':float(lower),'gap_nats':float(upper(lam)-lower)}

def run():
    wy=np.array([[[1,0],[1,0]],[[1,0],[0,1]]],float)
    result={'source':'https://arxiv.org/pdf/1805.05713v1','units':{'rate':'bits/channel use','mu':'natural-log objective penalty'},
            'method':'Direct mutual-information objective and independent SciPy constrained optimizer; no BA code',
            'binary_penalized':[],'binary_active_cost_extension':[],'fig2_budget_points':[]}
    for q in [.1,.4,.5]:
        for mu in [0.,.25,1.,2.,8.,20.]:
            row=optimize([1-q,q],wy,[q,0],[0,0],0,mu)
            p0=1/(1+math.exp(mu))
            row.update(q=q,mu=mu,analytic_p0=p0,analytic_p_error=abs(row['p'][0]-p0))
            # Scalar bounded independent optimization can be more accurate for tiny p0.
            scalar=minimize_scalar(lambda t: -(rate_nats([t,1-t],[1-q,q],wy)-mu*q*t),
                bounds=(0,.5),method='bounded',options={'xatol':1e-15,'maxiter':2000})
            row['independent_scalar_p0']=float(scalar.x)
            row['scalar_analytic_p_error']=abs(scalar.x-p0)
            result['binary_penalized'].append(row)
    for B in [.3,.5,.7,1.]:
        for mu in [0.,1.,4.]:
            q=.4; row=optimize([1-q,q],wy,[q,0],[0,1],B,mu)
            row.update(q=q,mu=mu,B=B,analytic_p0=max(1-B,1/(1+math.exp(mu))))
            row['certificate']=certificate(row['p'],[1-q,q],wy,[q,0],[0,1],B,mu)
            result['binary_active_cost_extension'].append(row)
    for D in [0.,.025,.05,.1,.15,.2,.3,.4]:
        row=optimize([.6,.4],wy,[.4,0],[0,0],0,0,D)
        p0=min(.5,D/.4)
        h=0 if p0==0 else -p0*math.log2(p0)-(1-p0)*math.log2(1-p0)
        row.update(budget_D=D,analytic_rate_bits=.4*h,separation_rate_bits=min(D,.4))
        result['fig2_budget_points'].append(row)
    ps=np.array([.65,.35]); b=np.array([0,1,2]); B=.9
    w=np.array([[[.9,.1],[.45,.55],[.15,.85]],[[.7,.3],[.2,.8],[.05,.95]]])
    v=np.array([[[.6,.4],[.8,.2],[.95,.05]],[[.55,.45],[.25,.75],[.05,.95]]])
    loss=np.array([[0,1],[1,0]]); c,est=bayes_cost(ps,v,loss)
    result['asymmetric_ternary_extension']={'ps':ps.tolist(),'wy_sxy':w.tolist(),'vz_sxz':v.tolist(),
       'joint_construction':'W_yz_given_xs=wy_sxy * vz_sxz (conditionally independent fixture)',
       'loss_sh':loss.tolist(),'cost_b':b.tolist(),'budget_B':B,'bayes_c':c.tolist(),'estimator_xz':est.tolist(),'solutions':[]}
    for mu in [0.,.7,4.,12.]:
        row=optimize(ps,w,c,b,B,mu)
        row['mu']=mu;row['certificate']=certificate(row['p'],ps,w,c,b,B,mu)
        result['asymmetric_ternary_extension']['solutions'].append(row)
    w3=np.array([[[.85,.1,.05],[.15,.7,.15],[.05,.1,.85]],[[.7,.25,.05],[.05,.75,.2],[.1,.15,.75]]])
    result['three_output_extension']={'ps':ps.tolist(),'wy_sxy':w3.tolist(),'vz_sxz':v.tolist(),
       'loss_sh':loss.tolist(),'cost_b':b.tolist(),'bayes_c':c.tolist(),'solutions':[]}
    for B3 in [.9,1.6,2.]:
        for mu in [0.,.7,4.,12.]:
            row=optimize(ps,w3,c,b,B3,mu)
            row.update(mu=mu,B=B3);row['certificate']=certificate(row['p'],ps,w3,c,b,B3,mu)
            result['three_output_extension']['solutions'].append(row)
    P=10.; normal=lambda s:math.exp(-s*s/2)/math.sqrt(2*math.pi)
    cap,err=quad(lambda s:normal(s)*.5*math.log1p(P*s*s)/LN2,-np.inf,np.inf,epsabs=1e-12,epsrel=1e-12)
    d=math.sqrt(math.pi/(2*P))*math.exp(1/(2*P))*erfc(1/math.sqrt(2*P))
    gauss={'power_linear':P,'paper_reported_gaussian_capacity_bits':1.213,'literal_model_gaussian_capacity_bits':cap,
       'adaptive_quadrature_reported_error':err,'gaussian_input_distortion':float(d),'minimum_distortion':1/(1+P),
       'paper_reported_2pam_capacity_bits':.733,'two_pam_gauss_hermite_convergence':[]}
    for k in [40,80,160,320,640,1280]:
        z,wt=roots_hermitenorm(k);wt/=math.sqrt(2*math.pi);a=math.sqrt(P)*z
        lt=np.logaddexp(0,-2*a[:,None]*(a[:,None]+z[None,:]))/LN2
        val=1-np.einsum('i,j,ij->',wt,wt,lt)
        gauss['two_pam_gauss_hermite_convergence'].append({'nodes_per_axis':k,'rate_bits':float(val)})
    def binary_rate_given_s(s):
        a=math.sqrt(P)*s
        def integrand(z):
            t=-2*a*(a+z)
            softplus=max(0,t)+math.log1p(math.exp(-abs(t)))
            return normal(z)*softplus/LN2
        return 1-quad(integrand,-12,12,epsabs=2e-11,epsrel=2e-11,limit=200)[0]
    direct,direct_err=quad(lambda s:2*normal(s)*binary_rate_given_s(s),0,12,
       epsabs=2e-10,epsrel=2e-10,limit=150)
    gauss['two_pam_independent_nested_adaptive_quadrature']={
       'rate_bits':direct,'outer_reported_error':direct_err,'inner_absolute_tolerance':2e-11,
       'normal_integration_limit':12,'note':'Independent of Gauss-Hermite refinement; standard-normal tails truncated at 12 sigma'}
    result['gaussian_separate_gate']=gauss
    here=pathlib.Path(__file__).parent
    (here/'independent-reference-fixtures.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'max_binary_scalar_p_error':max(r['scalar_analytic_p_error'] for r in result['binary_penalized']),
         'max_fig2_rate_error':max(abs(r['rate_bits']-r['analytic_rate_bits']) for r in result['fig2_budget_points']),
         'max_generic_certificate_gap':max(r['certificate']['gap_nats'] for r in result['asymmetric_ternary_extension']['solutions']),
         'gaussian':gauss},indent=2))

if __name__=='__main__':run()
