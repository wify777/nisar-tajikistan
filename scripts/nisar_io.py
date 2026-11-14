"""Helpers to read small parts of remote NISAR HDF5 files without downloading them.
The Earthdata token is read from ~/.nasa/earthdata_token and is never printed."""
import os, pathlib, requests, fsspec, h5py

def _token():
    return pathlib.Path(os.path.expanduser("~/.nasa/earthdata_token")).read_text().strip()

def signed_url(url):
    """Follow the Earthdata redirect once (1-byte range) and return the final pre-signed URL."""
    r = requests.get(url, headers={"Authorization": "Bearer " + _token(), "Range": "bytes=0-0"},
                     allow_redirects=True, timeout=60)
    r.raise_for_status()
    return r.url

def open_h5(url, block_mb=8):
    f = fsspec.open(signed_url(url), mode="rb", block_size=block_mb * 2**20, cache_type="blockcache").open()
    return h5py.File(f, "r")
