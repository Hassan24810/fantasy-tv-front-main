import { useState, useMemo } from "react";
import { 
  Heart, Star, Trophy, Gift, Users, Smile, ThumbsUp, Zap, MessageCircle, Shield,
  Vote, Target, Award, Crown, Medal, Flame, Sparkles, PartyPopper, Gem, Diamond,
  Timer, Clock, Calendar, Flag, FlagTriangleRight, Mountain, Sword, Swords,
  HandHeart, HeartHandshake, Handshake, Glasses, Eye, EyeOff, Mic, MicOff,
  Camera, Video, VideoOff, Phone, PhoneOff, Home, DoorOpen, DoorClosed, Bed,
  Wine, Beer, Coffee, Pizza, Cookie, Cake, IceCream2, Cherry, Apple, Banana,
  Carrot, UtensilsCrossed, Candy, Popcorn, GlassWater, Martini,
  Sun, Moon, CloudRain, Snowflake, Rainbow, Waves, Droplet, Leaf, TreePine,
  Flower, Flower2, Clover, Bug, Skull, Ghost, Cat, Dog, Bird, Fish, Rabbit,
  Squirrel, Turtle, BugPlay, Footprints,
  Car, Plane, Ship, Rocket, Bike, Train,
  Music, Music2, Music3, Music4, Headphones, Radio,
  Gamepad2, Dices, Puzzle, Drama, Clapperboard, Film, Tv, MonitorPlay,
  Shirt, Watch, Gem as GemIcon, Glasses as GlassesIcon, Umbrella,
  Compass, Map, MapPin, Navigation, Globe, Earth,
  BookOpen, GraduationCap, Briefcase, Building, Building2,
  Laptop, Smartphone, Tablet, Keyboard, Mouse, Cpu,
  Lock, Unlock, Key, KeyRound, DoorOpen as DoorOpenIcon,
  Bell, BellRing, AlertTriangle, AlertCircle, AlertOctagon, CircleAlert,
  Check, CheckCircle, CheckCircle2, X, XCircle, Ban,
  Plus, PlusCircle, Minus, MinusCircle, Equal,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, TrendingDown, BarChart, BarChart2, BarChart3, LineChart, PieChart,
  Activity, HeartPulse, Stethoscope, Pill, Syringe, Thermometer,
  Dumbbell, PersonStanding, Footprints as FootprintsIcon, 
  Baby, User, UserCheck, UserMinus, UserPlus, UserX, Users2, UsersRound,
  Hash, AtSign, Link, LinkIcon, ExternalLink,
  MessageSquare, MessagesSquare, Send, Inbox, Mail, MailOpen,
  Quote, Type, BookText, FileText, File, FolderOpen, Folder,
  Image, ImagePlus, ImageOff, CircleDot, Circle, Square, Triangle,
  Hexagon, Pentagon, Octagon, Star as StarIcon, Asterisk,
  Bolt, Power, Battery, BatteryCharging, BatteryFull, Plug,
  Wifi, WifiOff, Signal, SignalHigh, SignalLow, SignalZero,
  Volume, Volume1, Volume2, VolumeX, Megaphone, Speaker,
  Play, Pause, Square as SquareStop, SkipBack, SkipForward, FastForward, Rewind,
  Repeat, Repeat1, Shuffle, CirclePlay, CirclePause, CircleStop,
  RotateCcw, RotateCw, RefreshCw, RefreshCcw, Undo, Redo,
  Move, Move3d, Maximize, Minimize, Fullscreen, ShrinkIcon,
  Copy, Clipboard, ClipboardCheck, ClipboardList, ClipboardX,
  Save, SaveAll, Download, Upload, Share, Share2,
  Scissors, Eraser, Edit, Edit2, Edit3, Pencil, PenTool,
  Trash, Trash2, Archive, Package, Box, Boxes,
  Tag, Tags, Bookmark, BookmarkPlus, BookmarkMinus, BookmarkCheck,
  Heart as HeartFill, Star as StarFill, ThumbsDown,
  Angry, Frown, Meh, Laugh, SmilePlus, Annoyed,
  EyeIcon, SearchIcon, ZoomIn, ZoomOut, Scan, ScanLine, QrCode,
  Fingerprint, ShieldCheck, ShieldAlert, ShieldQuestion, ShieldOff,
  Info, HelpCircle, CircleHelp, BadgeInfo, BadgeCheck, BadgeAlert, BadgeX,
  Lightbulb, LightbulbOff, Flashlight, FlashlightOff,
  Sunrise, Sunset, CloudSun, CloudMoon,
  Anchor, Sailboat, Construction, Hammer, Wrench, Settings, Cog,
  Magnet, Wand, Wand2, Sparkle,
  CircleDollarSign, DollarSign, Euro, PoundSterling, Coins, Wallet, CreditCard,
  Receipt, ShoppingCart, ShoppingBag, Store, Percent,
  Ruler, Scale, Calculator, Binary, Code, Code2, Terminal,
  Lasso, Hand, Pointer, MousePointer, MousePointer2, Grab, GripVertical, GripHorizontal
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export interface IconOption {
  value: string;
  label: string;
  Icon: LucideIcon;
  keywords: string[];
}

export const allIconOptions: IconOption[] = [
  // Popular & Common
  { value: "star", label: "Star", Icon: Star, keywords: ["favorite", "rating", "popular"] },
  { value: "heart", label: "Heart", Icon: Heart, keywords: ["love", "like", "favorite"] },
  { value: "trophy", label: "Trophy", Icon: Trophy, keywords: ["winner", "champion", "prize", "award"] },
  { value: "award", label: "Award", Icon: Award, keywords: ["prize", "medal", "achievement"] },
  { value: "medal", label: "Medal", Icon: Medal, keywords: ["prize", "winner", "achievement"] },
  { value: "crown", label: "Crown", Icon: Crown, keywords: ["king", "queen", "royal", "winner"] },
  { value: "target", label: "Target", Icon: Target, keywords: ["goal", "aim", "focus", "bullseye"] },
  { value: "flag", label: "Flag", Icon: Flag, keywords: ["goal", "finish", "milestone"] },
  { value: "flagTriangle", label: "Flag Triangle", Icon: FlagTriangleRight, keywords: ["goal", "milestone", "mark"] },
  { value: "mountain", label: "Mountain", Icon: Mountain, keywords: ["goal", "climb", "achievement", "peak"] },
  
  // People & Relationships
  { value: "users", label: "Users", Icon: Users, keywords: ["people", "group", "team"] },
  { value: "users2", label: "Users Group", Icon: Users2, keywords: ["people", "group", "team", "crowd"] },
  { value: "usersRound", label: "Users Round", Icon: UsersRound, keywords: ["people", "group", "team"] },
  { value: "user", label: "User", Icon: User, keywords: ["person", "profile"] },
  { value: "userCheck", label: "User Check", Icon: UserCheck, keywords: ["approved", "verified", "accept"] },
  { value: "userPlus", label: "User Plus", Icon: UserPlus, keywords: ["add", "new", "invite"] },
  { value: "userMinus", label: "User Minus", Icon: UserMinus, keywords: ["remove", "leave"] },
  { value: "userX", label: "User X", Icon: UserX, keywords: ["remove", "eliminated", "kicked"] },
  { value: "baby", label: "Baby", Icon: Baby, keywords: ["child", "kid", "born"] },
  { value: "personStanding", label: "Person Standing", Icon: PersonStanding, keywords: ["person", "stand", "individual"] },
  { value: "handHeart", label: "Hand Heart", Icon: HandHeart, keywords: ["love", "care", "giving"] },
  { value: "heartHandshake", label: "Heart Handshake", Icon: HeartHandshake, keywords: ["love", "agreement", "partnership"] },
  { value: "handshake", label: "Handshake", Icon: Handshake, keywords: ["deal", "agreement", "partnership"] },
  { value: "footprints", label: "Footprints", Icon: Footprints, keywords: ["walk", "steps", "follow"] },
  
  // Emotions
  { value: "smile", label: "Smile", Icon: Smile, keywords: ["happy", "emoji", "emotion"] },
  { value: "laugh", label: "Laugh", Icon: Laugh, keywords: ["happy", "funny", "joy"] },
  { value: "smilePlus", label: "Smile Plus", Icon: SmilePlus, keywords: ["happy", "positive"] },
  { value: "meh", label: "Meh", Icon: Meh, keywords: ["neutral", "bored"] },
  { value: "frown", label: "Frown", Icon: Frown, keywords: ["sad", "unhappy"] },
  { value: "angry", label: "Angry", Icon: Angry, keywords: ["mad", "upset", "rage"] },
  { value: "annoyed", label: "Annoyed", Icon: Annoyed, keywords: ["irritated", "frustrated"] },
  { value: "thumbsUp", label: "Thumbs Up", Icon: ThumbsUp, keywords: ["like", "approve", "good"] },
  { value: "thumbsDown", label: "Thumbs Down", Icon: ThumbsDown, keywords: ["dislike", "disapprove", "bad"] },
  
  // Actions & Gestures
  { value: "zap", label: "Zap", Icon: Zap, keywords: ["power", "energy", "fast", "lightning"] },
  { value: "flame", label: "Flame", Icon: Flame, keywords: ["fire", "hot", "trending"] },
  { value: "sparkles", label: "Sparkles", Icon: Sparkles, keywords: ["magic", "special", "new"] },
  { value: "sparkle", label: "Sparkle", Icon: Sparkle, keywords: ["magic", "special", "shine"] },
  { value: "partyPopper", label: "Party Popper", Icon: PartyPopper, keywords: ["celebration", "party", "confetti"] },
  { value: "gift", label: "Gift", Icon: Gift, keywords: ["present", "surprise", "reward"] },
  { value: "gem", label: "Gem", Icon: Gem, keywords: ["diamond", "jewel", "precious"] },
  { value: "diamond", label: "Diamond", Icon: Diamond, keywords: ["gem", "jewel", "precious", "valuable"] },
  { value: "wand", label: "Magic Wand", Icon: Wand, keywords: ["magic", "spell"] },
  { value: "wand2", label: "Magic Wand 2", Icon: Wand2, keywords: ["magic", "spell"] },
  
  // Communication
  { value: "message", label: "Message", Icon: MessageCircle, keywords: ["chat", "talk", "conversation"] },
  { value: "messageSquare", label: "Message Square", Icon: MessageSquare, keywords: ["chat", "talk"] },
  { value: "messagesSquare", label: "Messages", Icon: MessagesSquare, keywords: ["chat", "conversation"] },
  { value: "mic", label: "Microphone", Icon: Mic, keywords: ["speak", "voice", "audio"] },
  { value: "micOff", label: "Mic Off", Icon: MicOff, keywords: ["mute", "silent"] },
  { value: "megaphone", label: "Megaphone", Icon: Megaphone, keywords: ["announce", "shout", "broadcast"] },
  { value: "phone", label: "Phone", Icon: Phone, keywords: ["call", "contact"] },
  { value: "phoneOff", label: "Phone Off", Icon: PhoneOff, keywords: ["hang up", "end call"] },
  { value: "vote", label: "Vote", Icon: Vote, keywords: ["poll", "election", "choice"] },
  { value: "quote", label: "Quote", Icon: Quote, keywords: ["speech", "say", "text"] },
  { value: "send", label: "Send", Icon: Send, keywords: ["message", "deliver"] },
  
  // Media & Entertainment
  { value: "camera", label: "Camera", Icon: Camera, keywords: ["photo", "picture"] },
  { value: "video", label: "Video", Icon: Video, keywords: ["record", "film", "movie"] },
  { value: "videoOff", label: "Video Off", Icon: VideoOff, keywords: ["stop recording"] },
  { value: "clapperboard", label: "Clapperboard", Icon: Clapperboard, keywords: ["movie", "film", "action"] },
  { value: "film", label: "Film", Icon: Film, keywords: ["movie", "cinema"] },
  { value: "tv", label: "TV", Icon: Tv, keywords: ["television", "show", "watch"] },
  { value: "monitorPlay", label: "Monitor Play", Icon: MonitorPlay, keywords: ["stream", "video"] },
  { value: "drama", label: "Drama", Icon: Drama, keywords: ["theater", "masks", "acting"] },
  { value: "music", label: "Music", Icon: Music, keywords: ["song", "audio"] },
  { value: "music2", label: "Music Notes", Icon: Music2, keywords: ["song", "notes"] },
  { value: "headphones", label: "Headphones", Icon: Headphones, keywords: ["audio", "listen"] },
  { value: "radio", label: "Radio", Icon: Radio, keywords: ["broadcast", "listen"] },
  { value: "gamepad", label: "Gamepad", Icon: Gamepad2, keywords: ["game", "play", "controller"] },
  { value: "dices", label: "Dice", Icon: Dices, keywords: ["game", "chance", "luck"] },
  { value: "puzzle", label: "Puzzle", Icon: Puzzle, keywords: ["game", "solve"] },
  
  // Food & Drink
  { value: "wine", label: "Wine", Icon: Wine, keywords: ["drink", "alcohol", "glass"] },
  { value: "beer", label: "Beer", Icon: Beer, keywords: ["drink", "alcohol"] },
  { value: "martini", label: "Martini", Icon: Martini, keywords: ["cocktail", "drink"] },
  { value: "coffee", label: "Coffee", Icon: Coffee, keywords: ["drink", "morning"] },
  { value: "glassWater", label: "Glass Water", Icon: GlassWater, keywords: ["drink", "hydrate"] },
  { value: "pizza", label: "Pizza", Icon: Pizza, keywords: ["food", "eat"] },
  { value: "cookie", label: "Cookie", Icon: Cookie, keywords: ["food", "snack", "sweet"] },
  { value: "cake", label: "Cake", Icon: Cake, keywords: ["birthday", "celebration", "sweet"] },
  { value: "iceCream", label: "Ice Cream", Icon: IceCream2, keywords: ["dessert", "cold", "sweet"] },
  { value: "candy", label: "Candy", Icon: Candy, keywords: ["sweet", "sugar"] },
  { value: "popcorn", label: "Popcorn", Icon: Popcorn, keywords: ["movie", "snack"] },
  { value: "cherry", label: "Cherry", Icon: Cherry, keywords: ["fruit"] },
  { value: "apple", label: "Apple", Icon: Apple, keywords: ["fruit", "healthy"] },
  { value: "banana", label: "Banana", Icon: Banana, keywords: ["fruit"] },
  { value: "utensils", label: "Utensils", Icon: UtensilsCrossed, keywords: ["food", "eat", "meal"] },
  
  // Home & Living
  { value: "home", label: "Home", Icon: Home, keywords: ["house", "villa"] },
  { value: "doorOpen", label: "Door Open", Icon: DoorOpen, keywords: ["enter", "exit", "welcome"] },
  { value: "doorClosed", label: "Door Closed", Icon: DoorClosed, keywords: ["closed", "private"] },
  { value: "bed", label: "Bed", Icon: Bed, keywords: ["sleep", "rest", "bedroom"] },
  { value: "umbrella", label: "Umbrella", Icon: Umbrella, keywords: ["rain", "protection"] },
  { value: "shirt", label: "Shirt", Icon: Shirt, keywords: ["clothes", "fashion"] },
  { value: "watch", label: "Watch", Icon: Watch, keywords: ["time", "accessory"] },
  { value: "glasses", label: "Glasses", Icon: Glasses, keywords: ["vision", "see", "style"] },
  
  // Nature & Weather
  { value: "sun", label: "Sun", Icon: Sun, keywords: ["day", "bright", "weather"] },
  { value: "sunrise", label: "Sunrise", Icon: Sunrise, keywords: ["morning", "dawn"] },
  { value: "sunset", label: "Sunset", Icon: Sunset, keywords: ["evening", "dusk"] },
  { value: "moon", label: "Moon", Icon: Moon, keywords: ["night", "dark"] },
  { value: "cloudRain", label: "Cloud Rain", Icon: CloudRain, keywords: ["weather", "rain"] },
  { value: "cloudSun", label: "Cloud Sun", Icon: CloudSun, keywords: ["weather", "partly cloudy"] },
  { value: "snowflake", label: "Snowflake", Icon: Snowflake, keywords: ["cold", "winter", "ice"] },
  { value: "rainbow", label: "Rainbow", Icon: Rainbow, keywords: ["colorful", "weather"] },
  { value: "waves", label: "Waves", Icon: Waves, keywords: ["water", "ocean", "sea"] },
  { value: "droplet", label: "Droplet", Icon: Droplet, keywords: ["water", "tear"] },
  { value: "leaf", label: "Leaf", Icon: Leaf, keywords: ["nature", "tree", "green"] },
  { value: "treePine", label: "Tree", Icon: TreePine, keywords: ["nature", "forest"] },
  { value: "flower", label: "Flower", Icon: Flower, keywords: ["nature", "bloom", "rose"] },
  { value: "flower2", label: "Flower 2", Icon: Flower2, keywords: ["nature", "bloom"] },
  { value: "clover", label: "Clover", Icon: Clover, keywords: ["luck", "nature", "lucky"] },
  
  // Animals
  { value: "cat", label: "Cat", Icon: Cat, keywords: ["pet", "animal"] },
  { value: "dog", label: "Dog", Icon: Dog, keywords: ["pet", "animal"] },
  { value: "bird", label: "Bird", Icon: Bird, keywords: ["animal", "fly"] },
  { value: "fish", label: "Fish", Icon: Fish, keywords: ["animal", "swim", "ocean"] },
  { value: "rabbit", label: "Rabbit", Icon: Rabbit, keywords: ["animal", "bunny"] },
  { value: "squirrel", label: "Squirrel", Icon: Squirrel, keywords: ["animal"] },
  { value: "turtle", label: "Turtle", Icon: Turtle, keywords: ["animal", "slow"] },
  { value: "bug", label: "Bug", Icon: Bug, keywords: ["insect", "error"] },
  { value: "skull", label: "Skull", Icon: Skull, keywords: ["death", "danger", "elimination"] },
  { value: "ghost", label: "Ghost", Icon: Ghost, keywords: ["spooky", "halloween"] },
  
  // Sports & Fitness
  { value: "dumbbell", label: "Dumbbell", Icon: Dumbbell, keywords: ["gym", "exercise", "fitness"] },
  { value: "activity", label: "Activity", Icon: Activity, keywords: ["fitness", "health"] },
  { value: "heartPulse", label: "Heart Pulse", Icon: HeartPulse, keywords: ["health", "heartbeat"] },
  
  // Travel & Transport
  { value: "car", label: "Car", Icon: Car, keywords: ["vehicle", "drive"] },
  { value: "plane", label: "Plane", Icon: Plane, keywords: ["fly", "travel", "airport"] },
  { value: "ship", label: "Ship", Icon: Ship, keywords: ["boat", "sail", "cruise"] },
  { value: "rocket", label: "Rocket", Icon: Rocket, keywords: ["space", "launch", "fast"] },
  { value: "bike", label: "Bike", Icon: Bike, keywords: ["bicycle", "cycle"] },
  { value: "train", label: "Train", Icon: Train, keywords: ["transport", "rail"] },
  { value: "sailboat", label: "Sailboat", Icon: Sailboat, keywords: ["boat", "sail"] },
  { value: "anchor", label: "Anchor", Icon: Anchor, keywords: ["boat", "ship", "navy"] },
  { value: "compass", label: "Compass", Icon: Compass, keywords: ["direction", "navigate"] },
  { value: "map", label: "Map", Icon: Map, keywords: ["location", "navigate"] },
  { value: "mapPin", label: "Map Pin", Icon: MapPin, keywords: ["location", "place"] },
  { value: "globe", label: "Globe", Icon: Globe, keywords: ["world", "earth", "international"] },
  { value: "earth", label: "Earth", Icon: Earth, keywords: ["world", "planet"] },
  
  // Status & Indicators
  { value: "shield", label: "Shield", Icon: Shield, keywords: ["protection", "security"] },
  { value: "shieldCheck", label: "Shield Check", Icon: ShieldCheck, keywords: ["verified", "secure"] },
  { value: "shieldAlert", label: "Shield Alert", Icon: ShieldAlert, keywords: ["warning", "danger"] },
  { value: "shieldOff", label: "Shield Off", Icon: ShieldOff, keywords: ["unprotected"] },
  { value: "lock", label: "Lock", Icon: Lock, keywords: ["secure", "private"] },
  { value: "unlock", label: "Unlock", Icon: Unlock, keywords: ["open", "access"] },
  { value: "key", label: "Key", Icon: Key, keywords: ["access", "secret", "unlock"] },
  { value: "bell", label: "Bell", Icon: Bell, keywords: ["notification", "alert"] },
  { value: "bellRing", label: "Bell Ring", Icon: BellRing, keywords: ["notification", "alert", "ring"] },
  { value: "alertTriangle", label: "Alert Triangle", Icon: AlertTriangle, keywords: ["warning", "danger"] },
  { value: "alertCircle", label: "Alert Circle", Icon: AlertCircle, keywords: ["warning", "info"] },
  { value: "info", label: "Info", Icon: Info, keywords: ["information", "help"] },
  { value: "helpCircle", label: "Help Circle", Icon: HelpCircle, keywords: ["question", "support"] },
  { value: "lightbulb", label: "Lightbulb", Icon: Lightbulb, keywords: ["idea", "think", "bright"] },
  { value: "check", label: "Check", Icon: Check, keywords: ["done", "complete", "yes"] },
  { value: "checkCircle", label: "Check Circle", Icon: CheckCircle, keywords: ["done", "approved", "success"] },
  { value: "x", label: "X", Icon: X, keywords: ["close", "cancel", "no"] },
  { value: "xCircle", label: "X Circle", Icon: XCircle, keywords: ["error", "cancel", "delete"] },
  { value: "ban", label: "Ban", Icon: Ban, keywords: ["block", "forbidden", "no"] },
  { value: "badgeCheck", label: "Badge Check", Icon: BadgeCheck, keywords: ["verified", "approved"] },
  { value: "badgeAlert", label: "Badge Alert", Icon: BadgeAlert, keywords: ["warning"] },
  
  // Combat & Competition
  { value: "sword", label: "Sword", Icon: Sword, keywords: ["fight", "battle", "weapon"] },
  { value: "swords", label: "Swords", Icon: Swords, keywords: ["fight", "battle", "duel"] },
  
  // Time
  { value: "timer", label: "Timer", Icon: Timer, keywords: ["countdown", "time"] },
  { value: "clock", label: "Clock", Icon: Clock, keywords: ["time", "hour"] },
  { value: "calendar", label: "Calendar", Icon: Calendar, keywords: ["date", "schedule"] },
  
  // Vision
  { value: "eye", label: "Eye", Icon: Eye, keywords: ["see", "view", "visible"] },
  { value: "eyeOff", label: "Eye Off", Icon: EyeOff, keywords: ["hidden", "invisible"] },
  
  // Money
  { value: "dollarSign", label: "Dollar Sign", Icon: DollarSign, keywords: ["money", "price", "cost"] },
  { value: "circleDollarSign", label: "Dollar Circle", Icon: CircleDollarSign, keywords: ["money", "price"] },
  { value: "coins", label: "Coins", Icon: Coins, keywords: ["money", "cash"] },
  { value: "wallet", label: "Wallet", Icon: Wallet, keywords: ["money", "payment"] },
  { value: "creditCard", label: "Credit Card", Icon: CreditCard, keywords: ["payment", "money"] },
  
  // Misc
  { value: "trendingUp", label: "Trending Up", Icon: TrendingUp, keywords: ["growth", "increase", "positive"] },
  { value: "trendingDown", label: "Trending Down", Icon: TrendingDown, keywords: ["decline", "decrease", "negative"] },
  { value: "barChart", label: "Bar Chart", Icon: BarChart, keywords: ["stats", "data", "graph"] },
  { value: "pieChart", label: "Pie Chart", Icon: PieChart, keywords: ["stats", "data", "percentage"] },
  { value: "hash", label: "Hash", Icon: Hash, keywords: ["number", "tag"] },
  { value: "tag", label: "Tag", Icon: Tag, keywords: ["label", "category"] },
  { value: "bookmark", label: "Bookmark", Icon: Bookmark, keywords: ["save", "favorite"] },
  { value: "scissors", label: "Scissors", Icon: Scissors, keywords: ["cut"] },
  { value: "hammer", label: "Hammer", Icon: Hammer, keywords: ["tool", "build"] },
  { value: "wrench", label: "Wrench", Icon: Wrench, keywords: ["tool", "fix", "settings"] },
  { value: "settings", label: "Settings", Icon: Settings, keywords: ["config", "gear"] },
  { value: "magnet", label: "Magnet", Icon: Magnet, keywords: ["attract", "pull"] },
  { value: "lasso", label: "Lasso", Icon: Lasso, keywords: ["select", "catch"] },
  { value: "hand", label: "Hand", Icon: Hand, keywords: ["stop", "wave"] },
  { value: "pointer", label: "Pointer", Icon: Pointer, keywords: ["click", "select"] },
  { value: "grab", label: "Grab", Icon: Grab, keywords: ["hold", "move"] },
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return allIconOptions;
    const query = search.toLowerCase();
    return allIconOptions.filter(
      (icon) =>
        icon.label.toLowerCase().includes(query) ||
        icon.value.toLowerCase().includes(query) ||
        icon.keywords.some((kw) => kw.toLowerCase().includes(query))
    );
  }, [search]);

  const selectedIcon = allIconOptions.find((i) => i.value === value);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-10"
        />
      </div>

      {/* Selected Icon Preview */}
      {selectedIcon && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
          <selectedIcon.Icon className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">{selectedIcon.label}</span>
          <span className="text-xs text-primary/70 ml-auto">Selected</span>
        </div>
      )}

      {/* Icon Grid */}
      <ScrollArea className="h-[200px] border border-slate-200 rounded-lg">
        <div className="grid grid-cols-6 gap-1 p-2">
          {filteredIcons.map((icon) => {
            const IconComp = icon.Icon;
            const isSelected = value === icon.value;
            return (
              <button
                key={icon.value}
                type="button"
                onClick={() => onChange(icon.value)}
                title={icon.label}
                className={cn(
                  "flex items-center justify-center p-2.5 rounded-lg transition-all hover:bg-slate-100",
                  isSelected && "bg-primary text-white hover:bg-primary/90"
                )}
              >
                <IconComp className={cn("h-5 w-5", !isSelected && "text-slate-600")} />
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-6 py-8 text-center text-sm text-slate-500">
              No icons found for "{search}"
            </div>
          )}
        </div>
      </ScrollArea>

      <p className="text-xs text-slate-500">
        {filteredIcons.length} icons available
      </p>
    </div>
  );
}

// Helper to get icon component by value
export function getIconByValue(value: string): LucideIcon | null {
  const icon = allIconOptions.find((i) => i.value === value);
  return icon?.Icon || null;
}
