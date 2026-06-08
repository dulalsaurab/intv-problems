import crypto from "crypto"

export function checkToken(userSuppliedToken) {

    const account = account.retriveToken(userSuppliedToken);
    if (account) {
        // if (account.server.token === userSuppliedToken) {
        //     // in the tripple === what happens is that the check goes through each char, and a match or a few match
        //     // could produce the output in at different timing and so attacker can brute-force this to get the right tocken
        //     // so instead of doing === we will use timesafe check from crypto
        // }
        crypto.timingSafeEqual(account.server.token, userSuppliedToken)
    }

} 

