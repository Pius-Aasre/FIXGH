import { useState } from 'react';

// Icons using basic SVGs for standalone support without external icon libraries
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const ReportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
);
const NewsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-newspaper"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
);
const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-50 relative border-x border-slate-200 shadow-xl overflow-hidden">
      
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-md z-10 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/><path d="m16.5 16-1.5 1.5"/><path d="M15 21h4"/></svg>
        <h1 className="text-xl font-bold tracking-tight">FixGH</h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'report' && <ReportTab />}
        {activeTab === 'news' && <NewsTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center p-3 pb-safe z-20">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'home' ? 'text-primary bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}>
          <HomeIcon />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>
        <button onClick={() => setActiveTab('report')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'report' ? 'text-primary bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}>
          <ReportIcon />
          <span className="text-[10px] mt-1 font-medium">Report</span>
        </button>
        <button onClick={() => setActiveTab('news')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'news' ? 'text-primary bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}>
          <NewsIcon />
          <span className="text-[10px] mt-1 font-medium">News</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'text-primary bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}>
          <ProfileIcon />
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
}

function HomeTab() {
  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">Good morning, Kwesi 👋</h2>
        <p className="text-slate-500 mt-1">Help improve your community today.</p>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Issues Reported</p>
            <p className="text-2xl font-bold text-primary mt-1">148 <span className="text-sm text-emerald-500">↑</span></p>
            <p className="text-[10px] text-slate-400 mt-1">This Month</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Issues Resolved</p>
            <p className="text-2xl font-bold text-primary mt-1">112 <span className="text-sm text-emerald-500">↑</span></p>
            <p className="text-[10px] text-slate-400 mt-1">This Month</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-3 px-1">Map View: Nearby Issues</h3>
        <div className="bg-slate-200 h-48 rounded-2xl w-full flex items-center justify-center relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 opacity-40 bg-[url('https://maps.wikimedia.org/osm-intl/13/4113/3980.png')] bg-cover bg-center mix-blend-multiply"></div>
          <button className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg relative z-10 hover:bg-primary-dark transition">Report nearby issue</button>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-3 px-1">Recent High-Priority Alerts</h3>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm relative">
            <span className="absolute top-4 right-4 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded">CRITICAL</span>
            <h4 className="font-bold text-slate-800">Burst Water Pipe</h4>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">📍 Spintex Road, Accra</p>
            <p className="text-xs text-slate-400 mt-2">Reported: 1 hr ago • 3 upvotes</p>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm relative">
            <span className="absolute top-4 right-4 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded">URGENT</span>
            <h4 className="font-bold text-slate-800">Open Manhole</h4>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">📍 Liberation Road, Airport City</p>
            <p className="text-xs text-slate-400 mt-2">Reported: 2 hrs ago • 1 upvote</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportTab() {
  return (
    <div className="p-4 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Report New Issue</h2>
        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3">
          <div className="bg-primary h-1.5 rounded-full w-1/3"></div>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-right">Step 1: Details</p>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Issue Image</label>
          <button type="button" className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            <span className="text-sm mt-2 font-medium">Upload a photo of the issue</span>
          </button>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
          <div className="relative">
            <select className="w-full p-3 pl-4 pr-10 bg-white border border-slate-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-primary/20 text-slate-700">
              <option>Pothole</option>
              <option>Blocked Drain</option>
              <option>Broken Streetlight</option>
              <option>Burst Pipe</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                ✨ AI Suggested
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Location Selector</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="h-24 bg-slate-200 flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-50 bg-[url('https://maps.wikimedia.org/osm-intl/13/4113/3980.png')] bg-cover bg-center"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 fill-red-500/20 relative z-10"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div className="p-3 flex justify-between items-center bg-slate-50">
              <p className="text-sm text-slate-700 truncate mr-2 flex items-center gap-1">📍 Accra-Aburi Road, Madina</p>
              <button type="button" className="text-xs font-bold text-primary whitespace-nowrap">Change</button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
          <textarea rows={3} placeholder="Provide details about the problem (e.g., location, severity, hazards)." className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 resize-none text-sm"></textarea>
        </div>

        <button type="submit" className="w-full bg-secondary text-white font-bold py-4 rounded-xl shadow-md hover:bg-slate-800 transition flex items-center justify-center gap-2 mt-4">
          Submit Report
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </form>
    </div>
  );
}

function NewsTab() {
  const newsItems = [
    {
      source: "GhanaWeb",
      sourceColor: "text-red-600",
      time: "2 hours ago",
      title: "Government flags off new road rehabilitation project in Kumasi",
      desc: "The Ministry of Roads and Highways has officially commenced the patching of major potholes stretching across the Kumasi metropolis, promising swift execution.",
      image: "https://images.unsplash.com/photo-1584852952403-91dd41d3ce3d?w=400&q=80",
    },
    {
      source: "Joy Prime",
      sourceColor: "text-blue-600",
      time: "5 hours ago",
      title: "ECG announces timetable for localized power upgrades in Greater Accra",
      desc: "Following multiple complaints of faulty transformers on the FixGH app, the Electricity Company of Ghana has released a schedule to upgrade distribution lines in Osu and Cantonments.",
      image: "https://images.unsplash.com/photo-1622322384666-224a1b023902?w=400&q=80",
    },
    {
      source: "GTV News",
      sourceColor: "text-green-600",
      time: "Yesterday",
      title: "Flooding update: GWCL clears blocked drains in Circle following citizen reports",
      desc: "Prompt action by the Ghana Water Company Limited has cleared the heavily congested drainage systems around Kwame Nkrumah Circle ahead of the rainy season.",
      image: "https://images.unsplash.com/photo-1541888045610-1845f91eb815?w=400&q=80",
    },
  ];

  return (
    <div className="animate-fade-in bg-slate-100 min-h-full pb-6">
      <div className="bg-white p-4 pb-2 shadow-sm mb-4">
        <h2 className="text-2xl font-bold text-slate-800">News Feed</h2>
        <p className="text-sm text-slate-500 mt-1">Infrastructure updates from trusted Ghanaian sources.</p>
        
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <button className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-full whitespace-nowrap">All News</button>
          <button className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full whitespace-nowrap border border-slate-200">Joy Prime</button>
          <button className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full whitespace-nowrap border border-slate-200">GTV News</button>
          <button className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full whitespace-nowrap border border-slate-200">GhanaWeb</button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {newsItems.map((item, idx) => (
          <article key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="h-40 bg-slate-200 relative">
              <img src={item.image} alt="News thumbnail" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                <span className={`text-[10px] font-black uppercase tracking-wider ${item.sourceColor}`}>{item.source}</span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">{item.time}</p>
              <h3 className="font-bold text-slate-800 leading-tight mb-2">{item.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.desc}</p>
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                  Read full story
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
                  <button className="text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProfileTab() {
  const history = [
    { title: "Pothole Repair #FG910", loc: "Accra Central", date: "Jul 20, 2024", status: "COMPLETED", color: "bg-emerald-100 text-emerald-700" },
    { title: "Blocked Drain #FG899", loc: "East Legon", date: "Jul 18, 2024", status: "IN PROGRESS", color: "bg-orange-100 text-orange-700" },
    { title: "Streetlight Out #FG875", loc: "Dansoman", date: "Jul 15, 2024", status: "VERIFIED", color: "bg-blue-100 text-blue-700" },
    { title: "Water Leak #FG841", loc: "Osu", date: "Jul 05, 2024", status: "PENDING", color: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="p-4 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border-2 border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Amara Kweku</h2>
            <p className="text-sm text-slate-500">Joined Jan 2023</p>
          </div>
        </div>
        <button className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">Edit</button>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider px-1">Settings</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {['My Reports', 'Notifications', 'Change Password', 'Help & Support'].map((item, i) => (
            <button key={i} className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition text-left">
              <span className="text-sm font-medium text-slate-700">{item}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Report History</h3>
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">12</span>
        </div>
        
        <div className="space-y-3">
          {history.map((h, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{h.title}</h4>
                <p className="text-xs text-slate-500">{h.loc} • {h.date}</p>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded tracking-wider ${h.color}`}>{h.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
