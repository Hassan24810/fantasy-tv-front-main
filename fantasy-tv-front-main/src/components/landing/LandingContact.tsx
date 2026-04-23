import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const teamMembers = [
  { name: "Robert Fox", role: "CEO", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
  { name: "Devon Lane", role: "Manager", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" },
  { name: "Marvin McKinney", role: "Developer", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { name: "Arlene McCoy", role: "Designer", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
];

export function LandingContact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    reachMeAt: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });
    setFormData({ name: "", phone: "", email: "", reachMeAt: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="relative py-24 md:py-32 overflow-hidden" style={{
      background: "linear-gradient(180deg, #070B18 0%, #0B1630 100%)",
    }}>
      <div className="container mx-auto px-4 md:px-16 relative z-10">
        <div className="text-left mb-12">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            Contact <span className="text-gradient">us</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              className="bg-[#0A1528] border-white/10 text-white placeholder:text-white/40 rounded-lg h-14"
            />
            <Input
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              className="bg-[#0A1528] border-white/10 text-white placeholder:text-white/40 rounded-lg h-14"
            />
            <Input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="bg-[#0A1528] border-white/10 text-white placeholder:text-white/40 rounded-lg h-14"
            />
            <Input
              name="reachMeAt"
              placeholder="Reach Me At"
              value={formData.reachMeAt}
              onChange={handleChange}
              className="bg-[#0A1528] border-white/10 text-white placeholder:text-white/40 rounded-lg h-14"
            />
            <Textarea
              name="message"
              placeholder="Message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              className="bg-[#0A1528] border-white/10 text-white placeholder:text-white/40 rounded-lg resize-none"
            />
          </form>

          {/* Quick Response Panel - Dark themed */}
          <div className="bg-[#0A1528]/80 border border-white/10 rounded-2xl p-8">
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Prepare For A Quick Response
            </h3>
            
            <p className="text-white/60 text-sm mb-6">interact@factasy.co</p>
            
            <div className="w-12 h-0.5 bg-white/20 mb-6" />
            
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-2">New York</h4>
              <div className="flex items-center gap-4 text-white/60 text-sm mb-1">
                <span>Get Direction</span>
                <span>+1 212-941-5220</span>
              </div>
              <p className="text-white/60 text-sm">Privacy Policy</p>
            </div>

            {/* Team members */}
            <div className="space-y-4">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-3">
                  <img 
                    src={member.avatar} 
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-white font-medium text-sm">{member.name}</div>
                    <div className="text-white/50 text-xs">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
