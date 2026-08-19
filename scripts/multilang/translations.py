# -*- coding: utf-8 -*-
"""Merge all translation parts into one dict set."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tr_part1 import T as _T1
from tr_part2 import T2 as _T2
from tr_part3 import T3 as _T3
from tr_part4 import T4 as _T4
from tr_part5 import T5 as _T5
from tr_part6 import T6 as _T6
from tr_part7 import A, PH, ARIA, IDENT, DS
from tr_part8 import TITLES, DESCS

T = {}
for d in (_T1, _T2, _T3, _T4, _T5, _T6):
    for k, v in d.items():
        if k in T and T[k] != v:
            print("WARN duplicate key with different value:", k[:60])
        T[k] = v

if __name__ == "__main__":
    print("T entries:", len(T))
    print("A entries:", len(A))
    print("PH entries:", len(PH))
    print("ARIA entries:", len(ARIA))
    print("IDENT entries:", len(IDENT))
    print("DS entries:", len(DS))
    print("TITLES:", len(TITLES), "DESCS:", len(DESCS))
    # validate title/desc lengths
    for f, t in TITLES.items():
        if len(t) > 60:
            print("TITLE TOO LONG (%d): %s :: %s" % (len(t), f, t))
    for f, d in DESCS.items():
        n = len(d)
        if n < 130 or n > 160:
            print("DESC RANGE (%d): %s" % (n, f))
