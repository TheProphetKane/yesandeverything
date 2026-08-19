"""MOVED 2026-08-19: the work queue lives in X:\\PortfolioOps\\queue\\ now.

This shim forwards to the canonical module so an unpatched caller still hits
the ONE real queue file instead of recreating a stale copy here. Update the
caller to X:\\PortfolioOps\\queue\\queue_write.py; the shim goes away once
nothing warns for a month.
"""
import sys

_NEW = r"X:\PortfolioOps\queue\queue_write.py"
sys.stderr.write("queue_write: moved to " + _NEW + "; update this caller\n")

if __name__ == "__main__":
    import runpy
    sys.argv[0] = _NEW
    runpy.run_path(_NEW, run_name="__main__")
else:
    import importlib.util
    _spec = importlib.util.spec_from_file_location(__name__, _NEW)
    _mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_mod)
    sys.modules[__name__] = _mod
    globals().update(vars(_mod))
