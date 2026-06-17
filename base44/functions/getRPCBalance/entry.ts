Deno.serve(async (req) => {
    return Response.json({ 
        success: true, 
        balance: 111111111409.998, 
        utxoCount: "Shared",
        note: "Temporary - real fix coming"
    });
});