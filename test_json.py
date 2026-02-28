import json
import sys
try:
    s = sys.argv[1]
    j = json.loads(s)
    print(j[0].get('pts'), type(j[0].get('pts')))
    print(j[0].get('c'), type(j[0].get('c')))
except Exception as e:
    print("Error:", e)
