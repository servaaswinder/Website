const links = document.querySelectorAll('.gallery a');

links.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const category = link.getAttribute('href');
    const element = document.querySelector(category);
    element.scrollIntoView({behavior: "smooth"});
  });
});
