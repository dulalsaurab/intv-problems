# 4. In-Memory File System / Unix `cd` ⭐

**Difficulty:** Medium → Hard
**Topics:** Tree, Hash Map, Path Parsing, Design
**Pattern:** Build a tree-backed FS → add traversal/search → handle path semantics

---

## Problem

Design an in-memory file system.

### Part A — Core

- `mkdir(path)` — create a directory (and any missing parents).
- `add_file(path, content)` — create/overwrite a file with text content.
- `ls(path)` — if `path` is a file, return a list with just its name; if a directory, return the **sorted** list of names directly under it.
- `read_file(path)` — return the file's content.

Paths are absolute, `/`-separated (e.g. `/a/b/c.txt`).

### Part B — Search

- `find(pattern)` — return all file paths whose name matches a glob pattern (e.g. `*.txt`).

### Part C — Working directory & `cd`

Add a current working directory.

- `cd(path)` — change the working directory. Support:
  - absolute paths (`/a/b`)
  - relative paths (`x/y`)
  - `.` (current) and `..` (parent)
  - **symlinks**, with **cycle detection** (don't infinite-loop on `a -> b -> a`).
- After `cd`, relative paths in other operations resolve against the working directory.

---

### Example 1

```
fs = FileSystem()
fs.mkdir("/a/b")
fs.add_file("/a/b/f.txt", "hello")
fs.ls("/a")            -> ["b"]
fs.ls("/a/b")          -> ["f.txt"]
fs.read_file("/a/b/f.txt") -> "hello"
fs.ls("/a/b/f.txt")    -> ["f.txt"]
```

### Example 2 (cd)

```
fs.cd("/a/b")
fs.read_file("f.txt")  -> "hello"   # relative to cwd
fs.cd("..")
fs.pwd()               -> "/a"
fs.cd("../a/./b")
fs.pwd()               -> "/a/b"
```

### Example 3 (symlink cycle)

```
fs.symlink("/loop", "/loop")   # points to itself
fs.cd("/loop")                 -> raises / returns error, does NOT hang
```

---

### Constraints

- Reading/creating under a path component that is a file (not a dir) is an error.
- `cd ..` at root stays at root.
- Normalize redundant slashes and `.` segments.

---

## Follow-up chain

1. **`rm` / `mv`:** delete and move nodes; moving a directory into its own subtree must be rejected.
2. **Permissions:** read/write bits per node.
3. **Hard vs. soft links:** distinguish; what happens to a hard link when the original is deleted?
4. **Memory:** how large can content get; streaming vs. in-memory.
