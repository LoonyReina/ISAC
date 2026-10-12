import importlib.util
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('strict_reference',Path(__file__).resolve().parent.parent/'independent_procrustes_reference.py')
strict=importlib.util.module_from_spec(spec);spec.loader.exec_module(strict)
def cn(rng,shape):return (rng.normal(size=shape)+1j*rng.normal(size=shape))/np.sqrt(2)
def symbols(rng,k,l):return ((2*rng.integers(0,2,(k,l))-1)+1j*(2*rng.integers(0,2,(k,l))-1))/np.sqrt(2)
def strict0(H,S,R):
    result=strict.solve(H,S,R)
    if result['status']!='certified':raise ArithmeticError('Strict reference certificate failed')
    return strict.unpack(result['X'])
