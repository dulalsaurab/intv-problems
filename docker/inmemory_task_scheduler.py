# writing a full task scheduler; a working prototype
# first we will write here in python and next in go

# input: task, ts
# output: completion / failure / error callback
# task should be schedule async

# we put everything in the heap; 
# as soon as time expires, we call that function though thread
#
import heapq
import threading
import os
import time
from dataclasses import dataclass, field
from typing import Callable, Any

class Task:
    run_at: float
    fn: Callable 
    args: tuple = field(default_factory=tuple)

    def __lt__(self, other):
        return self.run_at < other.run_at


class Scheduler:
    def __init__(self):
        self._heap = []
        self._lock = threading.Lock()
        self._event = threading.Event()
        self._stop = False
        self._thread = None
    
    def schedule(self, fn, delay, args):
        task = Task(run_at = time.monotonic() + delay, fn=fn, args=args)
        with self._lock:
            heapq.heappush(self._heap, task)
        self._event.set()

    def _workder():
        # peek, wait, pop, call
        pass

    def start():
        pass

    def stop():
        pass



