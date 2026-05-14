# 🌸 Ageless Rejuvenation – Medical‑Grade Beauty Spa Landing Page

A responsive, modern one‑page website for a luxury medical spa.  
The page presents premium anti‑aging treatments, a unique “女性養生・三點式” wellness concept, and direct booking via WhatsApp & Instagram.

Built with pure HTML/CSS/JS – no frameworks, no backend. Ideal for quick deployment on GitHub Pages, Netlify, or any static hosting.

![Hero Screenshot](https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format)  
*Hero image (Unsplash)*

---

## ✨ Project Highlights

- **Fully responsive** – adapts seamlessly from desktop to mobile.
- **Smooth scroll navigation** – one lightweight JavaScript helper.
- **WhatsApp floating button** – always visible, pre‑fills a booking message.
- **Clear service sections** – three core treatments + three wellness rituals.
- **Direct booking integration** – contact via WhatsApp or Instagram with one click.
- **No dependencies** – pure HTML/CSS, Font Awesome icons, Google Fonts.
- **Privacy‑friendly** – no forms, no data storage, just user‑initiated chat.

---

## 🗂️ Project Structure
ageless-rejuvenation/
├── index.html # Complete landing page (inline CSS & JS)
└── README.md # Project documentation (this file)

text

> Open `index.html` directly in any browser – no build steps required.

---

## 🧰 Features Overview

| Section                  | Content                                                                 |
|--------------------------|-------------------------------------------------------------------------|
| **Hero**                 | Brand tagline + call‑to‑action button to booking section               |
| **About**                | Technology (HD‑DU ultrasound, needle‑free pen, medical‑grade serums)   |
| **三大逆齡療程**          | HD‑DU超声 / 電動無痛水光筆 / 醫學級精華                                 |
| **女性養生・三點式**      | Back opening, womb & ovary care, breast wellness                       |
| **預約 (Booking)**        | Contact info, WhatsApp & Instagram direct booking buttons              |
| **Footer**               | Copyright and link to developer portfolio                              |
| **Floating action button** | Sticky WhatsApp icon for instant chat                                |

---

## 🛠️ Tech Stack

| Technology          | Purpose                                    |
|---------------------|--------------------------------------------|
| HTML5               | Semantic structure                         |
| CSS3                | Flexbox, Grid, custom animations, media queries |
| Font Awesome 6      | Icons for services, contact, social        |
| Google Fonts        | Playfair Display (headings) + Poppins (body) |
| Vanilla JavaScript  | Smooth scroll (no external libraries)      |

---

## 🚀 Getting Started

### 1. Clone or download the repository

bash
git clone https://github.com/your-username/ageless-rejuvenation.git
cd ageless-rejuvenation

## 2. Open the page
Simply double‑click index.html, or run a local server:

bash
# Python 3
python -m http.server 8000
Then visit http://localhost:8000.

## 3. Customise for your business
Edit the following details directly inside index.html:

html
<!-- WhatsApp number (appears in two places) -->
<a href="https://wa.me/+85291376887?text=我想預約逆齡重生術療程">

<!-- Instagram handle -->
<a href="https://www.instagram.com/your-spa-handle">

<!-- Contact details -->
<span>+852 9137 6887</span>
<span>hello@agelessspa.com</span>
<span>荔枝角 地鐵站B1出口 永康街55號 金百盛中心 2301室</span>
Replace Unsplash images with your own photos (clinic, treatments, or staff).

## 🎨 Customisation Guide
Primary colour – change #d9a38c (terracotta pink) in header, .btn, .service-card i, .section-title::after, etc.

Fonts – update the Google Fonts link and the font-family in body / h1, h2, h3.

Services – add or remove cards inside .services-grid or the wellness section.

Booking method – if you prefer a contact form, replace the WhatsApp buttons with a <form> (requires backend or a service like Formspree).

## 🌍 Deployment
Because the page is static, you can host it anywhere:

Platform	Steps
GitHub Pages	Push the repo → Settings → Pages → select main branch → Save
Netlify	Drag & drop the index.html file onto Netlify’s dashboard
Any web host	Upload index.html via FTP or file manager
## 📸 Image Credits
Hero background: Unsplash – Spa treatment

About image: Unsplash – Aesthetic room

Both are licensed under the Unsplash License (free for commercial use, no attribution required – though attribution is appreciated).

## 💡 Why I Built This
This landing page was created to:

Showcase premium spa treatments in a calm, trustworthy visual style.

Reduce friction for booking – every call‑to‑action leads directly to WhatsApp/Instagram.

Avoid backend complexity – the page is self‑contained and maintenance‑free.

Serve as a reusable template for similar wellness or beauty brands.

It prioritises conversion, mobile usability, and brand storytelling.

## 📝 Project Reflection
Building this page reinforced skills in:

Responsive layout design (Flexbox, Grid, media queries)

CSS animations (fadeInUp) for subtle engagement

Integrating third‑party chat links without APIs

Structuring a one‑page site for clear information hierarchy

Writing self‑contained HTML/CSS/JS that works anywhere

The result is a lightweight, professional landing page that can be deployed in minutes.

## 🌟 Status
✅ Complete – ready to use as a live business website.
🔧 Possible future improvements:

Add a simple contact form (using Formspree or Getform)

Include a before/after gallery

Support for multiple languages (Chinese/English toggle)

## 📄 License
MIT – you are free to use, modify, and distribute this code for personal or commercial projects.
If you appreciate the work, please keep the footer credit link to the developer portfolio.

text

Just copy the entire block above into a file named `README.md` and save it in the same folder as your `index.html`.  
The README is fully self‑contained and written in English, as requested.