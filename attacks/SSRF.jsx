// server site request forgery
// so in this excercise, we are going to understand how server site request forgery can happen 
// imaging we are fetching some file from server https://example.com/api/data?url=https://example.com/data/countries.json
// or https://example.com/api/data?url=https://example.com/data/public.json
// this location could have other secret data files as well, but since server could have higher previllage, if specifically not set for 
// files, attackers could fetch them as well
// quick solution; white listing

App.get("api/data", async (req, res) => {

    const url = req.query.url;
    const whitelistedserverfiles = ['https://example.com/data/countries.json', 'https://example.com/data/public.json']

    try{
        const response = await fetch(url);
        if (!whitelistedserverfiles.includes(url)) {
            res.status(400).json({error: "we got bad url"});
        } 
        const data = await response.json();
        res.status(200).json({data: data});
    } catch (err) {
        console.log(err)
        res.status(500).json({error: err.msg});
    }
})
