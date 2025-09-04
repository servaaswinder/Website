const links = document.querySelectorAll(".gallery a");

links.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const category = link.getAttribute("href");
    const element = document.querySelector(category);
    element.scrollIntoView({ behavior: "smooth" });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const navbar = document.getElementById("navbar");

  menuToggle.addEventListener("click", function () {
    navbar.classList.toggle("is-open");
  });
});
