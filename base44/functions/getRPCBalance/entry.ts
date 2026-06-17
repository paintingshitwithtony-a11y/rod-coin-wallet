Deno.serve(async (req) => {
    return Response.json({ 
        success: true, 
        balance: 11409.998, 
        utxoCount: 999,
        note: "TEST - If you see this, the function works"
    });
});