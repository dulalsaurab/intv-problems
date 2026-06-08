import { useEffect, useState } from "react";

export default function App() {
    // Holds the greeting fetched from the backend; undefined until the request resolves
    // const [message, setMessage] = useState();

    // // Empty dependency array: fetch the greeting once when the component mounts
    // useEffect(() => {
    //     // useEffect is react hooks that run side effects, meaning calling an api,
    //     // or websocket, timer, reading from loal storage and so on
    //     fetch("http://localhost:8000/api/hello") // just a anonymous js function
    //         .then((r) => r.json())
    //         .then((data) => setMessage(data.message));
    // }, []); // this is empty dependency, meaning just run once when the component loads
    // // for example if [message] in dependency, this will execute everytime message is changed

    // return <h1> {message} </h1>
    // }

    return (
        <div style={{ padding: "40px", fontFamily: "Arial" }}>
        <Login onResult={setResult} />

        <hr />

        <h3>Result:</h3>
        <p>{result}</p>
        </div>
    );
}