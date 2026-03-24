import type { AppConfig } from "@/components/AppBuilderForm";

const getHeroTagline = (type: string): string => {
  const taglines: Record<string, string> = {
    "Restaurant": "Delicious food, unforgettable experiences",
    "Salon & Spa": "Relax, rejuvenate, and feel your best",
    "Fitness Studio": "Transform your body, elevate your life",
    "Consulting Agency": "Expert solutions for your business growth",
    "Photography": "Capturing moments that last forever",
    "Retail Store": "Quality products, exceptional service",
    "Freelancer": "Professional services tailored to your needs",
    "Medical Practice": "Your health is our priority",
    "Real Estate": "Find your dream property today",
  };
  return taglines[type] || "Professional services you can trust";
};

const getServices = (type: string): string[] => {
  const services: Record<string, string[]> = {
    "Restaurant": ["Dine-In", "Takeout & Delivery", "Catering", "Private Events"],
    "Salon & Spa": ["Haircuts & Styling", "Facials & Skincare", "Massage Therapy", "Nail Services"],
    "Fitness Studio": ["Personal Training", "Group Classes", "Nutrition Plans", "Online Coaching"],
    "Consulting Agency": ["Business Strategy", "Market Research", "Digital Transformation", "Financial Advisory"],
    "Photography": ["Portraits", "Weddings", "Commercial", "Events"],
    "Retail Store": ["In-Store Shopping", "Online Orders", "Gift Cards", "Personal Shopping"],
    "Freelancer": ["Web Design", "Content Writing", "Branding", "Consulting"],
    "Medical Practice": ["General Checkups", "Specialist Consultations", "Lab Services", "Telehealth"],
    "Real Estate": ["Buying", "Selling", "Rentals", "Property Management"],
  };
  return services[type] || ["Service 1", "Service 2", "Service 3", "Service 4"];
};

export function generateAppHTML(config: AppConfig): string {
  const { businessName, businessType, features } = config;
  const tagline = getHeroTagline(businessType);
  const services = getServices(businessType);
  const primaryColor = "#0ea5e9";

  const navLinks = ["Home", ...features.map(f => {
    const labels: Record<string, string> = {
      about: "About", services: "Services", contact: "Contact", booking: "Book Now",
      gallery: "Gallery", testimonials: "Reviews", pricing: "Pricing", faq: "FAQ"
    };
    return labels[f] || f;
  })];

  let sections = "";

  if (features.includes("about")) {
    sections += `
    <section id="about" style="padding:80px 24px;max-width:800px;margin:0 auto;text-align:center">
      <h2 style="font-size:2rem;font-weight:700;margin-bottom:16px">About ${businessName}</h2>
      <p style="color:#64748b;font-size:1.1rem;line-height:1.8">
        Welcome to ${businessName}! We are a dedicated ${businessType.toLowerCase()} committed to providing 
        exceptional service to our community. With years of experience and a passion for what we do, 
        we strive to exceed your expectations every time.
      </p>
    </section>`;
  }

  if (features.includes("services")) {
    sections += `
    <section id="services" style="padding:80px 24px;background:#f8fafc">
      <div style="max-width:900px;margin:0 auto;text-align:center">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:40px">Our Services</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px">
          ${services.map(s => `
            <div style="background:white;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              <h3 style="font-size:1.1rem;font-weight:600;margin-bottom:8px">${s}</h3>
              <p style="color:#64748b;font-size:0.9rem">Quality ${s.toLowerCase()} services tailored to your needs.</p>
            </div>
          `).join("")}
        </div>
      </div>
    </section>`;
  }

  if (features.includes("pricing")) {
    sections += `
    <section id="pricing" style="padding:80px 24px;max-width:900px;margin:0 auto;text-align:center">
      <h2 style="font-size:2rem;font-weight:700;margin-bottom:40px">Pricing</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">
        ${["Basic", "Standard", "Premium"].map((plan, i) => `
          <div style="background:${i===1 ? primaryColor : 'white'};color:${i===1 ? 'white' : '#1e293b'};border-radius:12px;padding:40px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:${i===1?'none':'1px solid #e2e8f0'}">
            <h3 style="font-size:1.2rem;font-weight:600;margin-bottom:8px">${plan}</h3>
            <p style="font-size:2rem;font-weight:700;margin-bottom:16px">$${(i+1)*29}</p>
            <p style="font-size:0.9rem;opacity:0.8">Perfect for ${plan.toLowerCase()} needs</p>
          </div>
        `).join("")}
      </div>
    </section>`;
  }

  if (features.includes("testimonials")) {
    sections += `
    <section id="testimonials" style="padding:80px 24px;background:#f8fafc">
      <div style="max-width:800px;margin:0 auto;text-align:center">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:40px">What Our Clients Say</h2>
        ${["Amazing service! Highly recommended.", "Professional and reliable. Will come back!", "Best experience we've ever had."].map((t, i) => `
          <blockquote style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:left">
            <p style="color:#475569;font-style:italic;margin-bottom:8px">"${t}"</p>
            <p style="font-weight:600;font-size:0.9rem">— Happy Customer ${i+1}</p>
          </blockquote>
        `).join("")}
      </div>
    </section>`;
  }

  if (features.includes("gallery")) {
    sections += `
    <section id="gallery" style="padding:80px 24px;max-width:900px;margin:0 auto;text-align:center">
      <h2 style="font-size:2rem;font-weight:700;margin-bottom:40px">Gallery</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        ${[1,2,3,4,5,6].map(n => `
          <div style="background:linear-gradient(135deg,#e0f2fe,#bae6fd);border-radius:12px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#0369a1;font-weight:600">Photo ${n}</div>
        `).join("")}
      </div>
    </section>`;
  }

  if (features.includes("faq")) {
    sections += `
    <section id="faq" style="padding:80px 24px;max-width:700px;margin:0 auto">
      <h2 style="font-size:2rem;font-weight:700;margin-bottom:40px;text-align:center">FAQ</h2>
      ${["What are your hours?", "Do you offer free consultations?", "How can I book an appointment?"].map(q => `
        <details style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:12px;cursor:pointer">
          <summary style="font-weight:600">${q}</summary>
          <p style="color:#64748b;margin-top:12px">Please contact us for more details about this.</p>
        </details>
      `).join("")}
    </section>`;
  }

  if (features.includes("booking")) {
    sections += `
    <section id="booking" style="padding:80px 24px;background:#f8fafc">
      <div style="max-width:500px;margin:0 auto;text-align:center">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:24px">Book an Appointment</h2>
        <form style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:left" onsubmit="event.preventDefault();alert('Booking submitted!')">
          <label style="display:block;margin-bottom:16px"><span style="font-weight:500;font-size:0.9rem;display:block;margin-bottom:6px">Full Name</span><input type="text" required style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem" /></label>
          <label style="display:block;margin-bottom:16px"><span style="font-weight:500;font-size:0.9rem;display:block;margin-bottom:6px">Email</span><input type="email" required style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem" /></label>
          <label style="display:block;margin-bottom:16px"><span style="font-weight:500;font-size:0.9rem;display:block;margin-bottom:6px">Preferred Date</span><input type="date" required style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem" /></label>
          <button type="submit" style="width:100%;padding:12px;background:${primaryColor};color:white;border:none;border-radius:8px;font-weight:600;font-size:1rem;cursor:pointer">Book Now</button>
        </form>
      </div>
    </section>`;
  }

  if (features.includes("contact")) {
    sections += `
    <section id="contact" style="padding:80px 24px">
      <div style="max-width:500px;margin:0 auto;text-align:center">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:24px">Contact Us</h2>
        <form style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #e2e8f0;text-align:left" onsubmit="event.preventDefault();alert('Message sent!')">
          <label style="display:block;margin-bottom:16px"><span style="font-weight:500;font-size:0.9rem;display:block;margin-bottom:6px">Name</span><input type="text" required style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem" /></label>
          <label style="display:block;margin-bottom:16px"><span style="font-weight:500;font-size:0.9rem;display:block;margin-bottom:6px">Email</span><input type="email" required style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem" /></label>
          <label style="display:block;margin-bottom:24px"><span style="font-weight:500;font-size:0.9rem;display:block;margin-bottom:6px">Message</span><textarea rows="4" required style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem;resize:vertical"></textarea></label>
          <button type="submit" style="width:100%;padding:12px;background:${primaryColor};color:white;border:none;border-radius:8px;font-weight:600;font-size:1rem;cursor:pointer">Send Message</button>
        </form>
      </div>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${businessName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',system-ui,sans-serif; color:#1e293b; }
    a { text-decoration:none; color:inherit; }
  </style>
</head>
<body>
  <nav style="position:sticky;top:0;background:white;border-bottom:1px solid #e2e8f0;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;z-index:50">
    <strong style="font-size:1.2rem">${businessName}</strong>
    <div style="display:flex;gap:20px;font-size:0.9rem">
      ${navLinks.map(l => `<a href="#${l.toLowerCase().replace(/\s+/g,'')}" style="color:#64748b">${l}</a>`).join("")}
    </div>
  </nav>

  <header style="padding:100px 24px;text-align:center;background:linear-gradient(135deg,#f0f9ff,#e0f2fe)">
    <h1 style="font-size:3rem;font-weight:700;margin-bottom:16px">${businessName}</h1>
    <p style="font-size:1.25rem;color:#475569;margin-bottom:32px">${tagline}</p>
    <a href="#contact" style="display:inline-block;padding:14px 32px;background:${primaryColor};color:white;border-radius:8px;font-weight:600">Get in Touch</a>
  </header>

  ${sections}

  <footer style="padding:40px 24px;text-align:center;background:#1e293b;color:#94a3b8;font-size:0.9rem">
    <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}
