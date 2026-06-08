## DYTIL - Important concepts 

### Decorators / Wrapper

A decorator lets you “wrap” a function with extra behavior while keeping the original logic unchanged.

e.g.
```
def add (a, b):
    return a + b

def multiply (a, b):
    return a * b

if you want to add logging around these functions, you might want to add say pring(starting) ... return a + b print(ending)
and this code might duplicate everywhere, not just that you might be modifying the very function as well

wrapper lets you wrap your func (business logic) into another function, where you could do say. auth check, logging, caching and more

def wrapper(fn):

    def inner(*args, **kwargs): # support any arguments, function arg agnostic
        print ("starting function")
        res = fn(*args, **kwargs)
        print ("ending function")
        return res
    
    return inner # now inner wraps any function you pass here as arguments

add = wrapper(add)

add(5, 3)

// output 

print ("starting function")
print ("ending function")
8
```
The concept of wrapper is very powerful in web application, you have to do auth check everywhere, or call logging and so on

One final important point: decorator should be implemented, or either imported

some of the most common python decorator are @staticmethod, @classproperty, classproperty etc

