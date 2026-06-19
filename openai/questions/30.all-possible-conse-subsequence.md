## List of all possible consecutive sub-seq except forbidden pairs

Given n and a list of pairs of numbers that are forbidden to be in the same sequence, 
provide the number of possible sub-sequences (of any size) with consecutive numbers from 1 to n. 
Example: for n=4 and pairs=(1,3) there are 8 valid sequences are (1),(2),(3),(4),(1,2),(2,3),(3,4),(2,3,4) 
with (1,2,3),(1,2,3,4) being invalid as they contain a forbidden pair.

## Solution (backtracking)

```
def is_path_valid(path):
    return not (1 in path and 3 in path)
    
    
def sub_sequence(n):
    nums = [x for x in range(1, n+1)]
    res = []
    def backtracking(start, path):
        # for i in range (start+1, len(nums)+1):
        next_num = start + 1
        if next_num > n:
            return
        path.append(next_num)
        if is_path_valid(path):
            res.append(path.copy())
        backtracking(next_num, path)
        path.pop()
        
    
    for x in range(n):
        backtracking(x, [])
    print(res)

sub_sequence(4)
```

### Visual
```
start []
├── choose 1 -> [1] valid
│   ├── choose 2 -> [1, 2] valid
│   │   ├── choose 3 -> [1, 2, 3] invalid, stop this branch
│   │   └── choose 4 -> [1, 2, 4] valid
│   ├── choose 3 -> [1, 3] invalid, stop this branch
│   └── choose 4 -> [1, 4] valid
│
├── choose 2 -> [2] valid
│   ├── choose 3 -> [2, 3] valid
│   │   └── choose 4 -> [2, 3, 4] valid
│   └── choose 4 -> [2, 4] valid
│
├── choose 3 -> [3] valid
│   └── choose 4 -> [3, 4] valid
│
└── choose 4 -> [4] valid
```

### Solution using DFS

