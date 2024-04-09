let mainImage = document.querySelector(".center > img");

mainImage.addEventListener("click", function() {
    mainImage.width += 10;
});

mainImage.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    mainImage.width -= 10;
});

let submitButton = document.querySelector("body > div.center > form > input[type=submit]:nth-child(4)");
submitButton.disabled = true;
commentaire.addEventListener('keyup', (e) => submitButton.disabled = commentaire.value === '');
