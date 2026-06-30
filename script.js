const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

document.addEventListener("click", (event) => {
  const clickedInsideMenu = navLinks.contains(event.target);
  const clickedMenuButton = menuBtn.contains(event.target);

  if (!clickedInsideMenu && !clickedMenuButton) {
    navLinks.classList.remove("show");
  }
});
