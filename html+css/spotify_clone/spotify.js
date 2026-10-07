const hamBtn = document.getElementById('hamBtn')

const hamShow = document.getElementById("hamShow");

    hamBtn.onclick = () => {
        hamShow.style.display ="flex";
    }
// const searchInput = document.getElementById("search_input")

// let popularArtist = [{
//     name: "hitarth",
//     description: "artist"
// },
// {
//     name: "pritam",
//     description: "artist"
// },
// {
//     name: "vishal-shekar",
//     description: "artist"
// },
// {
//     name: "atif-aslam",
//     description: "artist"
// },
// {
//     name:"A.R.Rehman",
//     description: "artist"
// },
// {
//     name: "Arijit Singh",
//     description: "artist"
// }]
const searchInput = document.getElementById("search_input");
const artistCards = document.querySelectorAll(".artist-card");

searchInput.addEventListener("input", () => {
    const search = searchInput.value.toLowerCase();

    artistCards.forEach((card) => {
        const artistName = card
            .querySelector("a")
            .textContent
            .toLowerCase();

        if (artistName.includes(search)) {
            card.style.display = "flex";   // Show card
        } else {
            card.style.display = "none";   // Hide card
        }
    });
});

const imageArtist = document.getElementById(".artist-img")

imageArtist.addEventListener("dbclick", () => {
        imageArtist.classList.toggle("fullscreen")
})