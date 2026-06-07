'''
some of the quesiton to clarify:
 -

'''
from threading import Lock
import time

class InMemoryStorateTTL:
    
    def __init__(self):
        self._data = {}
        self._lock = Lock()

    
    def set(self, key, value, ttl=None):
        # lets say it was set to 5 seconds
        expires_at = time.monotonic() + ttl if ttl else None
        with self._lock:
            self._data[key] = (value, expires_at)
        
    
    def get():
        

    def delete():
        pass
    