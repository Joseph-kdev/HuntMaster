const SOME_ENDPOINT = "https://huntmaster-api.vercel.app";

export async function extractSkills(description) {
    if(!description.trim()) {
        throw new Error("No job description provided");
    }

    const response = await fetch(`${SOME_ENDPOINT}/api/extract-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ description})
    });

    if(!response.ok) {
        const error = await response.json()
        throw new Error(error || "Request failed")
    }

    return response.json();
}