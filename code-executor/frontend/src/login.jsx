import { useState } from "react";

export default function Login({ onResult }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        try {
            const res = await fetch (
                 `http://127.0.0.1:8000/api/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            );
            const data = await res.json();
            onResult(data.status);
        }
        catch (err) {
            onResult("error");
        }
    }
}
retrun (
    <div>
     <input
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <br />

      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />

      <button onClick={handleLogin}>Login</button>
    </div>
)