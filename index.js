window.onload = () => {
    const linksContainer = document.getElementById("links-container");
    getUtils().sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)).map((util) => {
        const linkBox = document.createElement("div");
        linkBox.classList.add("link-box");
        linksContainer.appendChild(linkBox); 

        const link = document.createElement("a");
        link.innerText = util.name;
        link.href = `./routes/${util.path}/index.html`;
        link.classList.add("link");
        linkBox.appendChild(link);
        
        const linkDescription = document.createElement("div");
        linkDescription.classList.add("link-description");
        linkDescription.innerText = util.description;
        linkBox.appendChild(linkDescription); 
    })
}