

class InMemoryKV:

    def __init__(self):
        self.storage = {} # key - value -- dict

    def set(self, key, value):
        self.storage[key] = value
        
    def get(self, key):
        if key in self.storage:
            return self.storage[key]
        return None
    
    def delete(self, key):
        if key in self.storage:
            del self.storage[key]
        
    

    