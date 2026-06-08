export default function root() {
    return (<Router><QueryParamsDemo /></Router>)
}

function useQuery(){
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search,), [search])
}

// https://example.com/settings?redirect=javascript:://dorunthisfunc()
// this is cross site scripting, meaning running script in server
// to prevent this we need to sanitize the url, check the protocol

function QueryParamsDemo(){
    let query = useQuery();

    function validateUrl(url) {
        const userSuppliedUrl = new URL(url);
        if (userSuppliedUrl.protocol === "https:") {
            return url
        } 

        return "/";
    }

    return (
        <div>
            <h2>Return Home</h2>
            <a href={validateUrl(query.get("redirect"))}>Click to go home</a>
        </div>
    )
}