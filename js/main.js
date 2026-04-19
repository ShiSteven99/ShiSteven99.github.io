// Navbar scroll shadow
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile hamburger
const hamburger = document.querySelector('.hamburger');
const navLinks  = document.querySelector('.nav-links');
hamburger?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const spans = hamburger.querySelectorAll('span');
  spans[0].style.transform = navLinks.classList.contains('open') ? 'rotate(45deg) translate(5px,5px)' : '';
  spans[1].style.opacity   = navLinks.classList.contains('open') ? '0' : '1';
  spans[2].style.transform = navLinks.classList.contains('open') ? 'rotate(-45deg) translate(5px,-5px)' : '';
});

// Active nav link
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (
    href === currentPage ||
    (currentPage === '' && href === 'index.html') ||
    (href === 'index.html' && currentPage === '')
  ) {
    a.classList.add('active');
  }
});

// Fade-in on scroll
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Project card expand/collapse
document.querySelectorAll('.project-card-header').forEach(header => {
  header.addEventListener('click', () => {
    const card = header.closest('.project-card');
    const isOpen = card.classList.contains('open');
    // Close all
    document.querySelectorAll('.project-card.open').forEach(c => c.classList.remove('open'));
    // Toggle clicked
    if (!isOpen) card.classList.add('open');
  });
});
