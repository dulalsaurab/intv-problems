# lets implement backend, this is someone our frontend with interract with
# we will be suing fastapi
from fastapi import FastAPI


'''
    Internally, FastAPI creates a structure that will store:
    - Routes
    - Middleware
    - Request handlers
    - OpenAPI documentation
    - Error handling

so we don't have to implement / store anything for our testing
'''
app = FastAPI() # creating an api object

@app.get("/api/hello")  # this is a python decorator, a function takes a function returns a function sort of
def hello():
    return {
        "message": "Hello from python"
    }
