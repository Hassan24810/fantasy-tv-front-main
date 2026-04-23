import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const teamMembers = [
  { name: "Alex Johnson", role: "CEO & Founder", avatar: "👨‍💼" },
  { name: "Sarah Chen", role: "Head of Product", avatar: "👩‍💻" },
  { name: "Mike Rivera", role: "Lead Developer", avatar: "👨‍🔧" },
  { name: "Emily Davis", role: "Customer Success", avatar: "👩‍🎤" },
];

export function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: "", phone: "", email: "", subject: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
            Let's Start Your{" "}
            <span className="text-gradient">Fantasy Journey</span>
          </h2>
          <p className="text-lg md:text-xl text-white/70">
            Get in touch with our team and we'll help you create the perfect fantasy experience for your show
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-6">
              Send us a message
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Your Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="bg-secondary border-border text-sm md:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Phone Number</label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="bg-secondary border-border text-sm md:text-base"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Email Address</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="bg-secondary border-border text-sm md:text-base"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Subject</label>
                <Input
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  className="bg-secondary border-border text-sm md:text-base"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Message</label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your show and what you're looking for..."
                  className="bg-secondary border-border min-h-[120px] text-sm md:text-base"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 py-5 md:py-6 text-sm md:text-base"
              >
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact Info & Team */}
          <div className="space-y-6 md:space-y-8">
            {/* Quick Response */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                Prepare For A Quick Response
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs md:text-sm text-white/60">Email us at</div>
                    <div className="text-white font-medium text-sm md:text-base">hello@fantasyreality.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs md:text-sm text-white/60">Call us at</div>
                    <div className="text-white font-medium text-sm md:text-base">+1 (555) 123-4567</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs md:text-sm text-white/60">Response time</div>
                    <div className="text-white font-medium text-sm md:text-base">Within 24 hours</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs md:text-sm text-white/60">Located in</div>
                    <div className="text-white font-medium text-sm md:text-base">Los Angeles, CA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                Meet Our Team
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {teamMembers.map((member, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary flex items-center justify-center text-xl md:text-2xl">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="font-medium text-white text-xs md:text-sm">{member.name}</div>
                      <div className="text-xs text-white/60">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}