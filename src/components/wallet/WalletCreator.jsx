import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Loader2, Sparkles, CheckCircle2, Copy, AlertTriangle,
    Eye, EyeOff, ShieldAlert, KeyRound, Shield, FileText, Lock
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * WalletCreator — 4-step wallet creation:
 *
 *  Step 1: "create"   — Enter name, passphrase (+ confirm), color
 *  Step 2: "recovery" — SUCCESS SCREEN: Show address, passphrase, WIF — user must save all
 *  Step 3: "done"     — Final confirmation, wallet is live
 *
 * Passphrase is validated FIRST (validateOnly call) before any address is generated.
 * ROD node-created wallets do not expose a BIP39 seed phrase; the WIF private key is the recovery key for this address.
 */

// Minimal BIP39-compatible wordlist (first 2048 words subset for client-side generation)
// We use crypto.getRandomValues for secure randomness
const BIP39_WORDS = [
    "abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse",
    "access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act",
    "action","actor","actress","actual","adapt","add","addict","address","adjust","admit",
    "adult","advance","advice","aerobic","afford","afraid","again","age","agent","agree",
    "ahead","aim","air","airport","aisle","alarm","album","alcohol","alert","alien",
    "all","alley","allow","almost","alone","alpha","already","also","alter","always",
    "amateur","amazing","among","amount","amused","analyst","anchor","ancient","anger","angle",
    "angry","animal","ankle","announce","annual","another","answer","antenna","antique","anxiety",
    "any","apart","apology","appear","apple","approve","april","arch","arctic","area",
    "arena","argue","arm","armor","army","around","arrange","arrest","arrive","arrow",
    "art","artefact","artist","artwork","ask","aspect","assault","asset","assist","assume",
    "asthma","athlete","atom","attack","attend","attitude","attract","auction","audit","august",
    "aunt","author","auto","autumn","average","avocado","avoid","awake","aware","away",
    "awesome","awful","awkward","axis","baby","balance","bamboo","banana","banner","barely",
    "bargain","barrel","base","basic","basket","battle","beach","bean","beauty","because",
    "become","beef","before","begin","behave","behind","believe","below","belt","bench",
    "benefit","best","betray","better","between","beyond","bicycle","bid","bike","bind",
    "biology","bird","birth","bitter","black","blade","blame","blanket","blast","bleak",
    "bless","blind","blood","blossom","blouse","blue","blur","blush","board","boat",
    "body","boil","bomb","bone","book","boost","border","boring","borrow","boss",
    "bottom","bounce","box","boy","bracket","brain","brand","brave","breeze","brick",
    "bridge","brief","bright","bring","brisk","broccoli","broken","bronze","broom","brother",
    "brown","brush","bubble","buddy","budget","buffalo","build","bulb","bulk","bullet",
    "bundle","bunker","burden","burger","burst","bus","business","busy","butter","buyer",
    "buzz","cabbage","cabin","cable","cactus","cage","cake","call","calm","camera",
    "camp","can","canal","cancel","candy","cannon","canvas","canyon","capable","capital",
    "captain","car","carbon","card","cargo","carpet","carry","cart","case","cash",
    "casino","castle","casual","cat","catalog","catch","category","cattle","caught","cause",
    "caution","cave","ceiling","celery","cement","census","century","cereal","certain","chair",
    "chalk","champion","change","chaos","chapter","charge","chase","chat","cheap","check",
    "cheese","chef","cherry","chest","chicken","chief","child","chimney","choice","choose",
    "chronic","chuckle","chunk","cigar","cinema","circle","citizen","city","civil","claim",
    "clap","clarify","claw","clay","clean","clerk","clever","click","client","cliff",
    "climb","clinic","clip","clock","clog","close","cloth","cloud","clown","club",
    "clump","cluster","clutch","coach","coast","coconut","code","coffee","coil","coin",
    "collect","color","column","combine","come","comfort","comic","common","company","concert",
    "conduct","confirm","congress","connect","consider","control","convince","cook","cool","copper",
    "copy","coral","core","corn","correct","cost","cotton","couch","country","couple",
    "course","cousin","cover","coyote","crack","cradle","craft","cram","crane","crash",
    "crazy","cream","credit","creek","crew","cricket","crime","crisp","critic","cross",
    "crouch","crowd","crucial","cruel","cruise","crumble","crunch","crush","cry","crystal",
    "cube","culture","cup","cupboard","curious","current","curtain","curve","cushion","custom",
    "cute","cycle","dad","damage","damp","dance","danger","daring","dash","daughter",
    "dawn","day","deal","debate","debris","decade","december","decide","decline","decorate",
    "decrease","deer","defense","define","defy","degree","delay","deliver","demand","demise",
    "denial","dentist","deny","depart","depend","deposit","depth","deputy","derive","describe",
    "desert","design","desk","despair","destroy","detail","detect","develop","device","devote",
    "diagram","dial","diamond","diary","dice","diesel","diet","differ","digital","dignity",
    "dilemma","dinner","dinosaur","direct","dirt","disagree","discover","disease","dish","dismiss",
    "disorder","display","distance","divert","divide","divorce","dizzy","doctor","document","dog",
    "doll","dolphin","domain","donate","donkey","donor","door","dose","double","dove",
    "draft","dragon","drama","drastic","draw","dream","dress","drift","drill","drink",
    "drip","drive","drop","drum","dry","duck","dumb","dune","during","dust",
    "dutch","duty","dwarf","dynamic","eager","eagle","early","earn","earth","easily",
    "east","easy","echo","ecology","edge","edit","educate","effort","egg","eight",
    "either","elbow","elder","electric","elegant","element","elephant","elevator","elite","else",
    "embark","embody","embrace","emerge","emotion","employ","empower","empty","enable","enact",
    "endless","endorse","enemy","energy","enforce","engage","engine","enhance","enjoy","enlist",
    "enough","enrich","enroll","ensure","enter","entire","entry","envelope","episode","equal",
    "equip","era","erase","erode","erosion","error","erupt","escape","essay","essence",
    "estate","eternal","ethics","evidence","evil","evoke","evolve","exact","example","excess",
    "exchange","excite","exclude","exercise","exhaust","exhibit","exile","exist","exit","exotic",
    "expand","expire","explain","expose","express","extend","extra","eye","fable","face",
    "faculty","faint","faith","fall","false","fame","family","famous","fan","fancy",
    "fantasy","far","fashion","fat","fatal","father","fatigue","fault","favorite","feature",
    "february","federal","fee","feed","feel","feet","fellow","felt","fence","festival",
    "fetch","fever","few","fiber","fiction","field","figure","file","film","filter",
    "final","find","fine","finger","finish","fire","firm","first","fiscal","fish",
    "fit","fitness","fix","flag","flame","flash","flat","flavor","flee","flight",
    "flip","float","flock","floor","flower","fluid","flush","fly","foam","focus",
    "fog","foil","follow","food","foot","force","forest","forget","fork","fortune",
    "forum","forward","fossil","foster","found","fox","fragile","frame","frequent","fresh",
    "friend","fringe","frog","front","frost","frown","frozen","fruit","fuel","fun",
    "funny","furnace","fury","future","gadget","gain","galaxy","gallery","game","gap",
    "garbage","garden","garlic","garment","gasp","gate","gather","gauge","gaze","general",
    "genius","genre","gentle","genuine","gesture","ghost","giant","gift","giggle","ginger",
    "giraffe","girl","give","glad","glance","glare","glass","glide","glimpse","globe",
    "gloom","glory","glove","glow","glue","goat","goddess","gold","good","goose",
    "gorilla","gospel","gossip","govern","gown","grab","grace","grain","grant","grape",
    "grasp","grass","gravity","great","green","grid","grief","grit","grocery","group",
    "grow","grunt","guard","guide","guilt","guitar","gun","gym","habit","hair",
    "half","hammer","hamster","hand","happy","harsh","harvest","hat","have","hawk",
    "hazard","head","health","heart","heavy","hedgehog","height","hello","helmet","help",
    "hen","hero","hidden","high","hill","hint","hip","hire","history","hobby",
    "hockey","hold","hole","hollow","home","honey","hood","hope","horn","hospital",
    "host","hour","hover","hub","huge","human","humble","humor","hundred","hungry",
    "hunt","hurdle","hurry","hurt","husband","hybrid","ice","icon","ignore","ill",
    "illegal","image","imitate","immense","immune","impact","impose","improve","impulse","inbox",
    "incident","include","income","index","indicate","indoor","industry","infant","inflict","inform",
    "inhale","inject","inner","innocent","input","inquiry","insane","insect","inside","inspire",
    "install","intact","interest","into","invest","invite","iron","island","isolate","issue",
    "item","ivory","jacket","jaguar","jar","jazz","jealous","jeans","jelly","jewel",
    "job","join","joke","journey","joy","judge","juice","jump","jungle","junior",
    "junk","just","kangaroo","keen","keep","ketchup","key","kick","kid","kingdom",
    "kiss","kit","kitchen","kite","kitten","kiwi","knee","knife","knock","know",
    "lab","lamp","language","laptop","large","later","laugh","laundry","lava","law",
    "lawn","lawsuit","layer","lazy","leader","learn","leave","lecture","left","leg",
    "legal","legend","leisure","lemon","lend","length","lens","leopard","lesson","letter",
    "level","liar","liberty","library","license","life","lift","like","limb","limit",
    "link","lion","liquid","list","little","live","lizard","load","loan","lobster",
    "local","lock","logic","lonely","long","loop","lottery","loud","lounge","love",
    "loyal","lucky","luggage","lumber","lunar","lunch","luxury","mad","magic","magnet",
    "maid","main","mammal","mango","mansion","manual","maple","marble","march","margin",
    "marine","market","marriage","mask","master","match","material","math","matrix","matter",
    "maximum","maze","meadow","mean","medal","media","melody","melt","member","memory",
    "mention","menu","mercy","merge","merit","merry","mesh","message","metal","method",
    "middle","midnight","milk","million","mimic","mind","minimum","minor","minute","miracle",
    "miss","mitten","mobile","model","modify","mom","monitor","monkey","monster","month",
    "moon","moral","more","morning","mosquito","mother","motion","motor","mountain","mouse",
    "move","movie","much","muffin","mule","multiply","muscle","museum","mushroom","music",
    "must","mutual","myself","mystery","naive","name","napkin","narrow","nasty","nature",
    "near","neck","need","negative","neglect","neither","nephew","nerve","nest","never",
    "news","next","nice","night","noble","noise","nominee","noodle","normal","north",
    "notable","note","nothing","notice","novel","now","nuclear","number","nurse","nut",
    "oak","obey","object","oblige","obscure","obtain","ocean","october","odor","off",
    "offer","office","often","oil","okay","old","olive","olympic","omit","once",
    "onion","open","option","orange","orbit","orchard","order","ordinary","organ","orient",
    "original","orphan","ostrich","other","outdoor","outside","oval","over","own","oyster",
    "ozone","pact","paddle","page","pair","palace","palm","panda","panel","panic",
    "panther","paper","parade","parent","park","parrot","party","pass","patch","path",
    "patrol","pause","pave","payment","peace","peanut","pear","peasant","pelican","pen",
    "penalty","pencil","people","pepper","perfect","permit","person","pet","phone","photo",
    "phrase","physical","piano","picnic","picture","piece","pig","pigeon","pill","pilot",
    "pink","pioneer","pipe","pistol","pitch","pizza","place","planet","plastic","plate",
    "play","please","pledge","pluck","plug","plunge","poem","poet","point","polar",
    "pole","police","pond","pony","pool","popular","portion","position","possible","post",
    "potato","pottery","poverty","powder","power","practice","praise","predict","prefer","prepare",
    "present","pretty","prevent","price","pride","primary","print","priority","prison","private",
    "prize","problem","process","produce","profit","program","project","promote","proof","property",
    "prosper","protect","proud","provide","public","pudding","pull","pulp","pulse","pumpkin",
    "pupil","puppy","purchase","purity","purpose","push","put","puzzle","pyramid","quality",
    "quantum","quarter","question","quick","quit","quiz","quote","rabbit","raccoon","race",
    "rack","radar","radio","rage","rail","rain","raise","rally","ramp","ranch",
    "random","range","rapid","rare","rate","rather","raven","reach","ready","real",
    "reason","rebel","rebuild","recall","receive","recipe","record","recycle","reduce","reflect",
    "reform","refuse","region","regret","regular","reject","relax","release","relief","rely",
    "remain","remember","remind","remove","render","renew","rent","reopen","repair","repeat",
    "replace","report","require","rescue","resemble","resist","resource","response","result","retire",
    "retreat","return","reunion","reveal","review","reward","rhythm","ribbon","rid","ride",
    "ridge","rifle","right","rigid","ring","riot","ripple","risk","ritual","rival",
    "river","road","roast","robot","robust","rocket","romance","roof","rookie","rose",
    "rotate","rough","round","route","royal","rubber","rude","rug","rule","run",
    "runway","rural","sad","saddle","sadness","safe","sail","salad","salmon","salon",
    "salt","salute","same","sample","sand","satisfy","satoshi","sauce","sausage","save",
    "scale","scan","scatter","scene","scheme","scissors","scorpion","scout","scrap","screen",
    "script","scrub","sea","search","season","seat","second","secret","section","security",
    "seek","segment","select","sell","seminar","senior","sense","sentence","series","service",
    "session","settle","setup","seven","shadow","shaft","shallow","share","shed","shell",
    "sheriff","shield","shift","shine","ship","shiver","shock","shoe","shoot","shop",
    "short","shoulder","shove","shrimp","shrug","shuffle","shy","sibling","siege","sight",
    "sign","silent","silk","silly","silver","similar","simple","since","sing","siren",
    "sister","situate","six","size","sketch","skill","skin","skirt","skull","slab",
    "slam","sleep","slender","slice","slide","slight","slim","slogan","slot","slow",
    "slush","small","smart","smile","smoke","smooth","snack","snake","snap","sniff",
    "snow","soap","soccer","social","sock","solar","soldier","solid","solution","solve",
    "someone","song","soon","sorry","soul","sound","soup","source","south","space",
    "spare","spatial","spawn","speak","special","speed","sphere","spice","spider","spike",
    "spin","spirit","split","spoil","sponsor","spoon","spray","spread","spring","spy",
    "square","squeeze","squirrel","stable","stadium","staff","stage","stairs","stamp","stand",
    "start","state","stay","steak","steel","stem","step","stereo","stick","still",
    "sting","stock","stomach","stone","stop","store","storm","story","stove","strategy",
    "street","strike","strong","struggle","student","stuff","stumble","subject","submit","subway",
    "success","sudden","suffer","sugar","suggest","suit","sunny","sunset","super","supply",
    "supreme","sure","surface","surge","surprise","sustain","swallow","swamp","swap","swear",
    "sweet","swift","swim","swing","switch","sword","symbol","symptom","syrup","table",
    "tackle","tag","tail","talent","tank","tape","target","task","tattoo","taxi",
    "teach","team","tell","ten","tenant","tennis","tent","term","test","text",
    "thank","that","theme","then","theory","there","they","thing","this","thought",
    "three","thrive","throw","thumb","thunder","ticket","tilt","timber","time","tiny",
    "tip","tired","title","toast","tobacco","today","together","toilet","token","tomato",
    "tomorrow","tone","tongue","tonight","tool","tooth","top","topic","topple","torch",
    "tornado","tortoise","toss","total","tourist","toward","tower","town","toy","track",
    "trade","traffic","tragic","train","transfer","trap","trash","travel","tray","treat",
    "tree","trend","trial","tribe","trick","trigger","trim","trip","trophy","trouble",
    "truck","truly","trumpet","trust","truth","try","tube","tuition","tumble","tuna",
    "tunnel","turkey","turn","turtle","twelve","twenty","twice","twin","twist","two",
    "type","typical","ugly","umbrella","unable","unaware","uncle","uncover","under","undo",
    "unfair","unfold","unhappy","uniform","unique","universe","unknown","unlock","until","unusual",
    "unveil","update","upgrade","uphold","upon","upper","upset","urban","useful","useless",
    "usual","utility","vacant","vacuum","vague","valid","valley","valve","van","vanish",
    "vapor","various","vast","vault","vehicle","velvet","vendor","venture","venue","verb",
    "verify","version","very","veteran","viable","vibrant","vicious","victory","video","view",
    "village","vintage","violin","virtual","virus","visa","visit","visual","vital","vivid",
    "vocal","voice","void","volcano","volume","vote","voyage","wage","wagon","wait",
    "walk","wall","walnut","want","warfare","warm","warrior","waste","water","wave",
    "way","wealth","weapon","wear","weasel","weather","web","wedding","weekend","weird",
    "welcome","well","west","wet","whale","wheat","wheel","when","where","whip",
    "whisper","wide","width","wife","wild","will","win","window","wine","wing",
    "wink","winner","winter","wire","wisdom","wish","witness","wolf","woman","wonder",
    "wood","wool","word","world","worry","worth","wrap","wreck","wrestle","wrist",
    "write","wrong","yard","year","yellow","you","young","youth","zebra","zero",
    "zone","zoo"
];

function generateSeedPhrase(wordCount = 12) {
    const words = [];
    const array = new Uint32Array(wordCount);
    crypto.getRandomValues(array);
    for (let i = 0; i < wordCount; i++) {
        words.push(BIP39_WORDS[array[i] % BIP39_WORDS.length]);
    }
    return words.join(' ');
}

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue',   class: 'from-blue-500 to-blue-700' },
    { name: 'Green',  class: 'from-green-500 to-green-700' },
    { name: 'Amber',  class: 'from-amber-500 to-amber-700' },
    { name: 'Pink',   class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan',   class: 'from-cyan-500 to-cyan-700' }
];

function CopyField({ label, value, mono = false, alwaysVisible = false }) {
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(alwaysVisible);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayValue = !visible ? '•'.repeat(Math.min(value.length, 40)) : value;

    return (
        <div className="space-y-1">
            <Label className="text-slate-400 text-xs uppercase tracking-wide">{label}</Label>
            <div className="flex items-center gap-2">
                <code className={`flex-1 text-xs bg-slate-800 border border-slate-700 p-2 rounded break-all ${mono ? 'font-mono' : ''} text-green-400`}>
                    {displayValue}
                </code>
                {!alwaysVisible && (
                    <button onClick={() => setVisible(v => !v)} className="text-slate-500 hover:text-slate-300 flex-shrink-0" title="Toggle visibility">
                        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
                <button onClick={handleCopy} className="text-slate-500 hover:text-green-400 flex-shrink-0" title="Copy">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

function SeedPhraseGrid({ seedPhrase }) {
    const [copied, setCopied] = useState(false);
    const words = seedPhrase.split(' ');

    const handleCopyAll = () => {
        navigator.clipboard.writeText(seedPhrase);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Seed Phrase (12 words)</Label>
                <button onClick={handleCopyAll} className="text-xs text-slate-500 hover:text-green-400 flex items-center gap-1">
                    {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy All'}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-800 border border-slate-700 rounded p-3">
                {words.map((word, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-900/60 rounded px-2 py-1">
                        <span className="text-slate-600 text-xs w-4 text-right flex-shrink-0">{i + 1}.</span>
                        <span className="text-green-400 text-xs font-mono font-medium">{word}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function WalletCreator({ account, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [step, setStep] = useState('create'); // 'create' | 'recovery' | 'done'
    const [error, setError] = useState('');

    // Recovery data returned from backend + generated seed phrase
    const [recoveryData, setRecoveryData] = useState(null);

    // Confirmation checkboxes on recovery screen
    const [savedAddress, setSavedAddress] = useState(false);
    const [savedKey, setSavedKey] = useState(false);
    const [savedPassphrase, setSavedPassphrase] = useState(false);
    const [savedSeed, setSavedSeed] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Please enter a wallet name');
            return;
        }

        if (passphrase && passphrase !== confirmPassphrase) {
            setError('Passphrases do not match. Please re-enter to confirm.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Step A: Validate passphrase first
            setLoadingMsg('Validating passphrase…');
            const validateRes = await base44.functions.invoke('createRootWallet', {
                walletName: name.trim(),
                passphrase: passphrase || undefined,
                validateOnly: true
            });

            if (validateRes.data?.code === 'WRONG_PASSPHRASE' || validateRes.data?.error) {
                setError(validateRes.data.error || 'Passphrase validation failed');
                return;
            }

            // Step B: Create wallet
            setLoadingMsg('Generating address…');
            const createRes = await base44.functions.invoke('createRootWallet', {
                walletName: name.trim(),
                label: name.trim(),
                color: selectedColor.class,
                passphrase: passphrase || undefined,
                validateOnly: false
            });

            if (createRes.data?.error) {
                setError(createRes.data.error);
                return;
            }

            const { address, wif, walletId, walletName } = createRes.data;
            if (!address || !walletId) {
                setError('Wallet creation failed: incomplete response from node');
                return;
            }

            setRecoveryData({
                address,
                wif,
                walletId,
                walletName: walletName || name.trim(),
                passphrase: passphrase || null
            });
            setStep('recovery');

        } catch (err) {
            setError('Failed to create wallet. Check your RPC connection and try again.');
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    const handleFinish = () => {
        const wallet = {
            id: recoveryData.walletId,
            name: recoveryData.walletName,
            wallet_address: recoveryData.address,
            balance: 0,
            is_active: false,
            wallet_type: 'standard',
            color: selectedColor.class,
            account_id: account.id
        };
        onCreated(wallet);
        toast.success(`Wallet "${wallet.name}" is ready`);
        setStep('done');
    };

    const allConfirmed = savedAddress && savedKey && savedSeed && (!recoveryData?.passphrase || savedPassphrase);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">

                {/* ── STEP 1: CREATE ── */}
                {step === 'create' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Create New Wallet
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Wallet Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setError(''); }}
                                    placeholder="e.g., Savings Wallet"
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                    maxLength={30}
                                />
                            </div>

                            <div>
                                <Label className="text-slate-300">
                                    Node Wallet Passphrase
                                    <span className="text-slate-500 text-xs ml-1">(required if wallet is encrypted)</span>
                                </Label>
                                <Input
                                    type="password"
                                    value={passphrase}
                                    onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                                    placeholder="Enter your node wallet passphrase"
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    This is the passphrase used to encrypt your ROD node wallet. It will be validated against the node before any address is generated.
                                </p>
                            </div>

                            {passphrase && (
                                <div>
                                    <Label className="text-slate-300">
                                        Confirm Passphrase
                                        <span className="text-red-400 text-xs ml-1">*</span>
                                    </Label>
                                    <Input
                                        type="password"
                                        value={confirmPassphrase}
                                        onChange={(e) => { setConfirmPassphrase(e.target.value); setError(''); }}
                                        placeholder="Re-enter passphrase to confirm"
                                        className={`bg-slate-800 border-slate-700 text-white mt-1 ${
                                            confirmPassphrase && confirmPassphrase !== passphrase
                                                ? 'border-red-500'
                                                : confirmPassphrase && confirmPassphrase === passphrase
                                                ? 'border-green-500'
                                                : ''
                                        }`}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                                    />
                                    {confirmPassphrase && confirmPassphrase !== passphrase && (
                                        <p className="text-xs text-red-400 mt-1">Passphrases do not match</p>
                                    )}
                                    {confirmPassphrase && confirmPassphrase === passphrase && (
                                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Passphrases match
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <Label className="text-slate-300 mb-2 block">Color Theme</Label>
                                <div className="grid grid-cols-6 gap-2">
                                    {WALLET_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setSelectedColor(color)}
                                            className={`h-10 rounded-lg bg-gradient-to-br ${color.class} ${
                                                selectedColor.name === color.name ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                                            } transition-opacity`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <Alert className="border-red-500/50 bg-red-500/10">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={loading || !name.trim() || (!!passphrase && passphrase !== confirmPassphrase)}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{loadingMsg || 'Working…'}</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4 mr-2" />Create Wallet</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── STEP 2: SUCCESS / RECOVERY SCREEN ── */}
                {step === 'recovery' && recoveryData && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Wallet Created — Save Your Details
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Success banner */}
                            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-green-300 font-semibold text-sm">
                                        "{recoveryData.walletName}" has been created on your ROD node.
                                    </p>
                                    <p className="text-green-400/70 text-xs mt-0.5">
                                        Save the WIF private key below right now — this is the only time it will be shown.
                                    </p>
                                </div>
                            </div>

                            {/* Critical warning */}
                            <Alert className="border-amber-500/50 bg-amber-500/10">
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <AlertDescription className="text-amber-300 text-xs">
                                    <strong>Write these down or store in a password manager.</strong> The private key is not the same as a seed phrase. ROD node wallets do not provide a BIP39 seed phrase, so the WIF private key is the recovery key for this address.
                                </AlertDescription>
                            </Alert>

                            {/* Wallet Address */}
                            <CopyField label="Wallet Address" value={recoveryData.address} mono alwaysVisible />

                            {/* Passphrase */}
                            {recoveryData.passphrase && (
                                <CopyField label="Node Wallet Passphrase" value={recoveryData.passphrase} mono={false} />
                            )}

                            {/* WIF Private Key */}
                            {recoveryData.wif ? (
                                <CopyField label="Private Key (WIF)" value={recoveryData.wif} mono />
                            ) : (
                                <Alert className="border-slate-600 bg-slate-800">
                                    <KeyRound className="w-4 h-4 text-slate-400" />
                                    <AlertDescription className="text-slate-400 text-sm">
                                        Private key could not be exported (wallet may have re-locked). Export manually via RPC Console: <code className="text-amber-400">dumpprivkey {recoveryData.address}</code>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Seed Phrase Notice */}
                            <Alert className="border-blue-500/50 bg-blue-500/10">
                                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <AlertDescription className="text-blue-300 text-xs space-y-1">
                                    <p><strong>Seed Phrase:</strong> Not available for this node-created wallet.</p>
                                    <p>Private key (WIF) and seed phrase are different. For ROD Core/node-generated wallets, save the WIF private key shown above.</p>
                                </AlertDescription>
                            </Alert>

                            {/* Divider */}
                            <div className="border-t border-slate-700 pt-3">
                                <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                                    <Lock className="w-3 h-3" />
                                    Confirm you have saved each item before continuing:
                                </p>

                                <div className="space-y-2">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={savedAddress}
                                            onChange={(e) => setSavedAddress(e.target.checked)}
                                            className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="text-sm text-slate-300 group-hover:text-white">
                                            I have saved the <strong className="text-white">wallet address</strong>
                                        </span>
                                    </label>

                                    {recoveryData.passphrase && (
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={savedPassphrase}
                                                onChange={(e) => setSavedPassphrase(e.target.checked)}
                                                className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                            />
                                            <span className="text-sm text-slate-300 group-hover:text-white">
                                                I have saved my <strong className="text-white">passphrase</strong> securely
                                            </span>
                                        </label>
                                    )}

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={savedKey}
                                            onChange={(e) => setSavedKey(e.target.checked)}
                                            className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="text-sm text-slate-300 group-hover:text-white">
                                            I have saved the <strong className="text-white">private key (WIF)</strong> — it will not be shown again
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={savedSeed}
                                            onChange={(e) => setSavedSeed(e.target.checked)}
                                            className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="text-sm text-slate-300 group-hover:text-white">
                                            I understand there is <strong className="text-white">no seed phrase</strong> for this node-created wallet, and I saved the WIF private key
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <Button
                                onClick={handleFinish}
                                disabled={!allConfirmed}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40"
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                I've Saved Everything — Finish Setup
                            </Button>
                        </div>
                    </>
                )}

                {/* ── STEP 3: DONE ── */}
                {step === 'done' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Wallet Ready
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p className="text-slate-300 text-sm">
                                Your wallet <strong className="text-white">{recoveryData?.walletName}</strong> has been created and is managed by your ROD node.
                            </p>
                            {recoveryData?.address && (
                                <div>
                                    <Label className="text-slate-400 text-xs">Address</Label>
                                    <code className="text-xs text-green-400 bg-slate-800 p-2 rounded block mt-1 break-all font-mono">
                                        {recoveryData.address}
                                    </code>
                                </div>
                            )}
                            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                                Close
                            </Button>
                        </div>
                    </>
                )}

            </DialogContent>
        </Dialog>
    );
}