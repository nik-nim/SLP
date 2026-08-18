// ===== CONFIG — API keys moved to environment-safe placeholders =====
    // ⚠️ Security: Move GEMINI_API_KEY to a Firebase Cloud Function in production
    const GEMINI_API_KEY = window.APP_CONFIG?.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || "";

    let lang = 'hi';
    const themeModeLabels = {
        hi: { auto: 'ऑटो', dark: 'डार्क', light: 'लाइट' },
        en: { auto: 'Auto', dark: 'Dark', light: 'Light' }
    };

    // ===== FIREBASE AUTH =====
    let firebaseInitialized = false;
    let currentUser = null;

    function initializeFirebase() {
        if(firebaseInitialized) return;
        
        if(!window.APP_CONFIG?.FIREBASE_CONFIG?.apiKey) {
            console.warn('Firebase config not loaded');
            return;
        }
        
        try {
            firebase.initializeApp(window.APP_CONFIG.FIREBASE_CONFIG);
            firebaseInitialized = true;
            
            // Monitor auth state
            firebase.auth().onAuthStateChanged((user) => {
                currentUser = user;
                updateLoginUI();
                if(user) {
                    window.currentUserName = user.displayName || user.email.split('@')[0];
                    loadFromCloud();
                }
            });
            
            console.log('Firebase initialized successfully');
        } catch(e) {
            console.error('Firebase init error:', e);
        }
    }

    function updateLoginUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        
        if(currentUser) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            userInfo.innerText = `${uiTexts[lang].helloText}, ${window.currentUserName}!`;
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userInfo.classList.add('hidden');
            window.currentUserName = '';
        }
    }

    // Google Login
    window.loginWithGoogle = function() {
        if(!firebaseInitialized) {
            showCustomAlert('त्रुटि', 'Firebase अभी लोड नहीं हुआ है', 'error');
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                window.currentUserName = result.user.displayName || result.user.email.split('@')[0];
                updateLoginUI();
                saveToCloud(appState);
                showCustomAlert('सफल', 'Google लॉगिन सफल! 🎉', 'success');
            })
            .catch((error) => {
                showCustomAlert('लॉगिन विफल', error.message, 'error');
            });
    };

    // Logout
    window.logout = function() {
        showCustomConfirm(
            lang === 'hi' ? 'लॉगआउट करें?' : 'Logout?',
            lang === 'hi' ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure?',
            () => {
                firebase.auth().signOut().then(() => {
                    window.currentUserName = '';
                    updateLoginUI();
                    showCustomAlert('सफल', lang === 'hi' ? 'लॉगआउट सफल' : 'Logged out', 'success');
                });
            }
        );
    };

    // Save to Cloud (Firestore)
    window.saveToCloud = function(data) {
        if(!currentUser || !firebaseInitialized) return;
        
        const db = firebase.firestore();
        db.collection('users').doc(currentUser.uid).set({
            email: currentUser.email,
            displayName: currentUser.displayName,
            groceryList: data,
            lastUpdated: new Date()
        }, { merge: true })
        .then(() => {
            console.log('Data saved to cloud');
        })
        .catch((error) => {
            console.error('Cloud save error:', error);
        });
    };

    // Load from Cloud (Firestore)
    window.loadFromCloud = function() {
        if(!currentUser || !firebaseInitialized) return;
        
        const db = firebase.firestore();
        db.collection('users').doc(currentUser.uid).get()
            .then((doc) => {
                if(doc.exists && doc.data().groceryList) {
                    Object.keys(doc.data().groceryList).forEach(k => {
                        if(appState[k]) appState[k] = doc.data().groceryList[k];
                    });
                    renderCategories();
                    showCustomAlert('क्लाउड', 'आपकी लिस्ट लोड हो गई', 'success');
                }
            })
            .catch((error) => {
                console.error('Cloud load error:', error);
            });
    };

    // Initialize Firebase when page loads
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeFirebase, 500);
    });
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const themeBtn = document.getElementById('themeBtn');
    const themeLabel = document.getElementById('themeBtnText');
    let darkForced = localStorage.getItem('darkMode');
    const systemDark = prefersDark.matches;

    function applyTheme(mode) {
        if(mode === 'dark') {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.classList.remove('light-mode');
            if(themeBtn) themeBtn.classList.add('dark-mode');
            if(themeBtn) themeBtn.classList.remove('light-mode');
            if(themeBtn) themeBtn.setAttribute('aria-checked', 'true');
            if(themeLabel) themeLabel.textContent = themeModeLabels[lang]?.dark || 'Dark';
        } else if(mode === 'light') {
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.classList.add('light-mode');
            if(themeBtn) themeBtn.classList.remove('dark-mode');
            if(themeBtn) themeBtn.classList.add('light-mode');
            if(themeBtn) themeBtn.setAttribute('aria-checked', 'false');
            if(themeLabel) themeLabel.textContent = themeModeLabels[lang]?.light || 'Light';
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.classList.remove('light-mode');
            if(themeBtn) themeBtn.classList.remove('dark-mode');
            if(themeBtn) themeBtn.classList.remove('light-mode');
            if(themeBtn) themeBtn.setAttribute('aria-checked', systemDark ? 'true' : 'false');
            if(themeLabel) themeLabel.textContent = themeModeLabels[lang]?.auto || 'Auto';
        }
    };

    if(darkForced === 'dark' || darkForced === 'light') applyTheme(darkForced);
    else applyTheme('auto');

    prefersDark.addEventListener('change', () => {
        if(!localStorage.getItem('darkMode')) {
            applyTheme('auto');
        }
    });

    window.toggleDark = function() {
        if(darkForced === 'dark') {
            darkForced = 'light';
            localStorage.setItem('darkMode', 'light');
            applyTheme('light');
        } else if(darkForced === 'light') {
            darkForced = null;
            localStorage.removeItem('darkMode');
            applyTheme('auto');
        } else {
            darkForced = 'dark';
            localStorage.setItem('darkMode', 'dark');
            applyTheme('dark');
        }
    }

    // ===== CUSTOM MODAL =====
    window.openModal = function(icon, title, message, showInput, buttons) {
        document.getElementById('modalIcon').innerText = icon;
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = message;
        const inp = document.getElementById('modalInput');
        if(showInput) { inp.classList.remove('hidden'); inp.value = ''; setTimeout(()=>inp.focus(), 100); }
        else inp.classList.add('hidden');
        const btn = document.getElementById('modalButtons');
        btn.innerHTML = '';
        buttons.forEach(b => {
            const el = document.createElement('button');
            el.className = b.className; el.innerText = b.text; el.onclick = b.onClick;
            btn.appendChild(el);
        });
        const m = document.getElementById('customModal');
        m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); document.getElementById('modalContent').classList.remove('scale-95'); }, 10);
    }
    window.closeCustomModal = function() {
        const m = document.getElementById('customModal');
        m.classList.add('opacity-0'); document.getElementById('modalContent').classList.add('scale-95');
        setTimeout(() => m.classList.add('hidden'), 250);
    }
    window.showCustomAlert = function(title, msg, type='info') {
        const icon = type==='success'?'✅':type==='error'?'❌':'🔔';
        openModal(icon, title, msg, false, [{ text:'OK', className:'px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md w-full smooth', onClick:closeCustomModal }]);
    }
    window.showCustomConfirm = function(title, msg, cb) {
        openModal('⚠️', title, msg, false, [
            { text: lang==='hi'?'रद्द':'Cancel', className:'px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex-1 smooth', onClick:closeCustomModal },
            { text: lang==='hi'?'हाँ, पक्का':'Yes', className:'px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl flex-1 shadow-md smooth', onClick:()=>{closeCustomModal();cb();} }
        ]);
    }
    window.showCustomPrompt = function(title, msg, ph, cb) {
        openModal('📝', title, msg, true, [
            { text: lang==='hi'?'रद्द':'Cancel', className:'px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex-1 smooth', onClick:closeCustomModal },
            { text: lang==='hi'?'ठीक है':'OK', className:'px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl flex-1 shadow-md smooth', onClick:()=>{ let v=document.getElementById('modalInput').value; closeCustomModal(); if(v&&v.trim()) cb(v); } }
        ]);
        document.getElementById('modalInput').placeholder = ph;
    }

    // ===== DATA =====
    let vratMode = false;
    let syncTimer = null;
    let searchQuery = '';
    window.currentUserName = '';

    const uiTexts = {
        hi: {
            switchLangBtn:"🔄 English", vratBtnOn:"पूरा सामान", vratBtnOff:"व्रत मोड",
            mainTitle:"|| प्रज्ञासूची ||", subTitle:"स्मार्ट और मॉडर्न डिजिटल किराना पर्ची",
            aiBoxTitle:"AI से ऑटोमैटिक सामान जोड़ें", voiceBtnReady:"बोलकर जोड़ें", voiceBtnListening:"सुन रहा हूँ...",
            aiInputPlaceholder:"सामान का नाम लिखें या पेस्ट करें...", aiBtn:"जोड़ें",
            bagTitle:"आपका थैला", budgetText:"बजट:", estBill:"💰 बिल: ₹", budgetWarn:"⚠️",
            speakBtn:"🔊 सुनें", waBtn:"📱 WhatsApp", printBtn:"📝 पर्ची", addCustomBtn:"➕ नया सामान खुद लिखें",
            featureCards:[
                { title:"ऑफ़लाइन रेडी", desc:"इंस्टॉल होने योग्य PWA सर्विस वर्कर कैशिंग और तेज़ लोड के साथ।" },
                { title:"AI स्मार्ट इनपुट", desc:"वॉइस और बिल स्कैन विकल्प से सामान तेज़ी से जोड़ें।" },
                { title:"क्लाउड सिंक", desc:"Google लॉगिन, अपनी लिस्ट को सुरक्षित रूप से सेव और लोड करें।" },
                { title:"थीम कंट्रोल", desc:"ऑटो/डार्क/लाइट मोड स्विच और लोकल प्रेफरेंस सेव।" }
            ],
            emptyBag:"थैला खाली है... नीचे से सामान चुनें।", printSubTitle:"किराना व सब्जी की पर्ची",
            backBtn:"← पीछे जाएं", dateText:"तारीख: ", totalItemsText:"कुल: ",
            voiceNotSupported:"माफ़ करें, यह ब्राउज़र आवाज़ सपोर्ट नहीं करता।",
            aiSuccess:"✅ सामान थैले में जुड़ गया!", aiFail:"मशीन इसे पहचान नहीं पाई। खुद टिक लगाएं।",
            bagEmptyAlert:"थैला खाली है!", newCustomPrompt:"नए सामान का नाम लिखें:",
            customAdded:"लिस्ट में जोड़ दिया गया!", loginBtn:"लॉगिन", logoutBtn:"लॉगआउट", helloText:"नमस्ते",
            searchPlaceholder:"सामान खोजें... (जैसे: चाय, soap, आटा)",
            quickAdd:"जल्दी जोड़ें:", noResults:"कोई सामान नहीं मिला",
            budgetLabel:"खर्च:"
        },
        en: {
            switchLangBtn:"🔄 हिंदी", vratBtnOn:"All Items", vratBtnOff:"Fasting Mode",
            mainTitle:"|| PragyaSuchi ||", subTitle:"Smart Modern Digital Grocery List",
            aiBoxTitle:"Add Items via AI", voiceBtnReady:"Tap to Speak", voiceBtnListening:"Listening...",
            aiInputPlaceholder:"Type item names or paste list...", aiBtn:"Add",
            bagTitle:"Your Bag", budgetText:"Budget:", estBill:"💰 Bill: ₹", budgetWarn:"⚠️",
            speakBtn:"🔊 Listen", waBtn:"📱 WhatsApp", printBtn:"📝 Print", addCustomBtn:"➕ Add Custom Item",
            featureCards:[
                { title:"Offline Ready", desc:"Installable PWA with service worker caching and faster loads." },
                { title:"AI Smart Input", desc:"Voice and bill scan options to add items quickly and naturally." },
                { title:"Cloud Sync", desc:"Google login, save and load your grocery lists securely." },
                { title:"Theme Control", desc:"Auto / dark / light mode switching with local preference saved." }
            ],
            emptyBag:"Bag is empty... select items below.", printSubTitle:"Grocery & Veggie List",
            backBtn:"← Go Back", dateText:"Date: ", totalItemsText:"Total: ",
            voiceNotSupported:"Voice input not supported on this browser.",
            aiSuccess:"✅ Items added to bag!", aiFail:"Could not recognize. Please tick manually.",
            bagEmptyAlert:"Your bag is empty!", newCustomPrompt:"Enter item name:",
            customAdded:"Added to the list!", loginBtn:"Login", logoutBtn:"Logout", helloText:"Hello",
            searchPlaceholder:"Search items... (e.g. tea, soap, flour)",
            quickAdd:"Quick add:", noResults:"No items found",
            budgetLabel:"Spent:"
        }
    };

    const categoryData = [
        { nameHi:"१. ताज़ी सब्जियां और फल", nameEn:"1. Fresh Veggies & Fruits", emoji:"🥦",
          items:[
            {id:1,nameHi:"आलू",nameEn:"Potato",keys:["aloo","potato","alu"],price:30,vrat:true},
            {id:2,nameHi:"प्याज",nameEn:"Onion",keys:["pyaz","onion","kanda"],price:40,vrat:false},
            {id:3,nameHi:"टमाटर",nameEn:"Tomato",keys:["tamatar","tomato"],price:50,vrat:true},
            {id:4,nameHi:"हरी मिर्च",nameEn:"Green Chilli",keys:["hari mirch","chilli","mirchi"],price:80,vrat:true},
            {id:5,nameHi:"हरा धनिया",nameEn:"Coriander Leaves",keys:["hara dhaniya","coriander"],price:100,vrat:true},
            {id:6,nameHi:"नींबू",nameEn:"Lemon",keys:["nimbu","lemon"],price:100,vrat:true},
            {id:7,nameHi:"अदरक",nameEn:"Ginger",keys:["adrak","ginger"],price:150,vrat:true},
            {id:8,nameHi:"लहसुन",nameEn:"Garlic",keys:["lahsun","garlic","lassan"],price:200,vrat:false},
            {id:9,nameHi:"लौकी / कद्दू",nameEn:"Bottle Gourd / Pumpkin",keys:["lauki","kaddu","pumpkin"],price:40,vrat:true},
            {id:10,nameHi:"गाजर / मूली",nameEn:"Carrot / Radish",keys:["gajar","mooli","carrot","radish"],price:60,vrat:true},
            {id:11,nameHi:"सेब",nameEn:"Apple",keys:["seb","apple"],price:150,vrat:true},
            {id:12,nameHi:"केला",nameEn:"Banana",keys:["kela","banana"],price:60,vrat:true},
            {id:13,nameHi:"भिंडी",nameEn:"Okra / Bhindi",keys:["bhindi","okra","ladyfinger"],price:60,vrat:false},
            {id:14,nameHi:"पालक",nameEn:"Spinach",keys:["palak","spinach"],price:40,vrat:true},
            {id:15,nameHi:"बैगन",nameEn:"Brinjal / Eggplant",keys:["baigan","baingan","brinjal"],price:40,vrat:false}
          ]
        },
        { nameHi:"२. अनाज और आटा", nameEn:"2. Grains & Flours", emoji:"🌾",
          items:[
            {id:101,nameHi:"गेहूं का आटा",nameEn:"Wheat Flour",keys:["aata","wheat","आटा"],price:40,vrat:false},
            {id:102,nameHi:"मैदा",nameEn:"Maida",keys:["maida","meda"],price:45,vrat:false},
            {id:103,nameHi:"चावल बासमती",nameEn:"Basmati Rice",keys:["basmati","chawal","rice"],price:100,vrat:false},
            {id:104,nameHi:"चावल नॉर्मल",nameEn:"Normal Rice",keys:["normal chawal","chawal"],price:50,vrat:false},
            {id:105,nameHi:"सूजी / रवा",nameEn:"Suji / Rawa",keys:["suji","sooji","rawa"],price:50,vrat:false},
            {id:106,nameHi:"बेसन",nameEn:"Besan",keys:["besan"],price:90,vrat:false},
            {id:107,nameHi:"मक्के / बाजरे का आटा",nameEn:"Corn / Bajra Flour",keys:["makka","bajra"],price:40,vrat:false}
          ]
        },
        { nameHi:"३. सभी प्रकार की दालें", nameEn:"3. Dals & Pulses", emoji:"🫘",
          items:[
            {id:201,nameHi:"अरहर / तुअर दाल",nameEn:"Toor Dal",keys:["arhar","toor","tuar"],price:160,vrat:false},
            {id:202,nameHi:"मसूर दाल - लाल",nameEn:"Masoor Dal (Red)",keys:["masoor"],price:90,vrat:false},
            {id:203,nameHi:"मूंग दाल - पीली",nameEn:"Moong Dal (Yellow)",keys:["moong dhuli","mung"],price:110,vrat:false},
            {id:204,nameHi:"चना दाल",nameEn:"Chana Dal",keys:["chana dal"],price:85,vrat:false},
            {id:205,nameHi:"उड़द दाल - सफेद",nameEn:"Urad Dal (White)",keys:["urad dhuli","udad"],price:130,vrat:false},
            {id:206,nameHi:"राजमा",nameEn:"Rajma",keys:["rajma"],price:140,vrat:false},
            {id:207,nameHi:"सफेद छोले / काबुली",nameEn:"White Chole",keys:["chole","kabuli"],price:130,vrat:false},
            {id:208,nameHi:"काले चने",nameEn:"Black Chana",keys:["kale chane"],price:90,vrat:true},
            {id:209,nameHi:"सोयाबीन बड़ी",nameEn:"Soya Chunks",keys:["soyabean","badi","nutrela"],price:120,vrat:false}
          ]
        },
        { nameHi:"४. तेल, घी, नमक, चीनी", nameEn:"4. Oil, Ghee, Salt, Sugar", emoji:"🫙",
          items:[
            {id:301,nameHi:"सरसों का तेल",nameEn:"Mustard Oil",keys:["sarso","mustard","oil"],price:150,vrat:false},
            {id:302,nameHi:"रिफाइंड तेल",nameEn:"Refined Oil",keys:["refined","soyabean oil"],price:130,vrat:true},
            {id:303,nameHi:"मूंगफली का तेल",nameEn:"Peanut Oil",keys:["mungfali tel","peanut oil"],price:180,vrat:true},
            {id:304,nameHi:"नमक - सादा",nameEn:"Normal Salt",keys:["namak","salt"],price:25,vrat:false},
            {id:305,nameHi:"सेंधा नमक (व्रत)",nameEn:"Rock Salt (Sendha)",keys:["sendha","vrat namak"],price:60,vrat:true},
            {id:306,nameHi:"काला नमक",nameEn:"Black Salt",keys:["kala namak"],price:60,vrat:true},
            {id:307,nameHi:"देशी घी",nameEn:"Desi Ghee",keys:["ghee","desi"],price:600,vrat:true},
            {id:308,nameHi:"चीनी",nameEn:"Sugar",keys:["chini","sugar","suger","cheeni"],price:45,vrat:true},
            {id:309,nameHi:"गुड़",nameEn:"Jaggery (Gud)",keys:["gud","jaggery"],price:60,vrat:true}
          ]
        },
        { nameHi:"५. मसाले और तड़का", nameEn:"5. Spices & Herbs", emoji:"🌶️",
          items:[
            {id:401,nameHi:"हल्दी पाउडर",nameEn:"Turmeric Powder",keys:["haldi","turmeric"],price:250,vrat:false},
            {id:402,nameHi:"लाल मिर्च पाउडर",nameEn:"Red Chilli Powder",keys:["lal mirch","mirchi"],price:300,vrat:true},
            {id:403,nameHi:"धनिया पाउडर",nameEn:"Coriander Powder",keys:["dhaniya powder"],price:200,vrat:true},
            {id:404,nameHi:"जीरा",nameEn:"Cumin Seeds (Jeera)",keys:["jeera","zeera"],price:600,vrat:true},
            {id:405,nameHi:"काली मिर्च",nameEn:"Black Pepper",keys:["kali mirch","black pepper"],price:800,vrat:true},
            {id:406,nameHi:"हींग",nameEn:"Asafoetida (Hing)",keys:["hing","heeng"],price:2000,vrat:false},
            {id:407,nameHi:"गरम मसाला",nameEn:"Garam Masala",keys:["garam masala"],price:500,vrat:false},
            {id:408,nameHi:"राई / सरसों दाने",nameEn:"Mustard Seeds",keys:["rai","raya"],price:100,vrat:false},
            {id:409,nameHi:"खड़े मसाले (लौंग/इलायची)",nameEn:"Whole Spices",keys:["khade masale","laung","elaichi"],price:1500,vrat:false},
            {id:410,nameHi:"कसूरी मेथी",nameEn:"Kasuri Methi",keys:["kasuri methi","methi"],price:300,vrat:false},
            {id:411,nameHi:"केसर",nameEn:"Saffron",keys:["kesar","saffron"],price:3000,vrat:true},
            {id:412,nameHi:"सोया सॉस",nameEn:"Soya Sauce",keys:["soya sauce","sauce"],price:80,vrat:false},
            {id:413,nameHi:"सिरका (Vinegar)",nameEn:"Vinegar",keys:["sirka","vinegar"],price:60,vrat:false},
            {id:414,nameHi:"बेकिंग पाउडर",nameEn:"Baking Powder",keys:["baking powder"],price:50,vrat:false},
            {id:415,nameHi:"वैनिला एसेंस",nameEn:"Vanilla Essence",keys:["vanilla essence","essence"],price:100,vrat:false}
          ]
        },
        { nameHi:"६. चाय, नाश्ता और मेवे", nameEn:"6. Tea, Breakfast & Dry Fruits", emoji:"☕",
          items:[
            {id:501,nameHi:"चाय पत्ती",nameEn:"Tea Powder",keys:["chai","tea","chay","patti"],price:400,vrat:true},
            {id:502,nameHi:"कॉफी",nameEn:"Coffee",keys:["coffee","kofi"],price:100,vrat:true},
            {id:503,nameHi:"मैगी / नूडल्स",nameEn:"Maggi / Noodles",keys:["maggi","meggi","noodles"],price:14,vrat:false},
            {id:504,nameHi:"पोहा",nameEn:"Poha",keys:["poha"],price:60,vrat:false},
            {id:505,nameHi:"दलिया / ओट्स",nameEn:"Daliya / Oats",keys:["daliya","oats"],price:60,vrat:false},
            {id:506,nameHi:"बिस्कुट / कुकीज़",nameEn:"Biscuits",keys:["biscuit","biskut","cookies"],price:30,vrat:false},
            {id:507,nameHi:"नमकीन / भुजिया",nameEn:"Namkeen / Bhujia",keys:["namkeen","bhujia"],price:200,vrat:false},
            {id:508,nameHi:"मिक्स ड्राई फ्रूट्स",nameEn:"Dry Fruits (Mix)",keys:["dry fruits","kaju","badam","kishmish"],price:800,vrat:true},
            {id:509,nameHi:"पिस्ता",nameEn:"Pistachio",keys:["pista","pistachio"],price:1200,vrat:true},
            {id:510,nameHi:"खजूर",nameEn:"Dates",keys:["khajoor","khajur","dates"],price:300,vrat:true},
            {id:511,nameHi:"अंजीर",nameEn:"Fig",keys:["anjeer","fig"],price:1000,vrat:true},
            {id:512,nameHi:"अखरोट",nameEn:"Walnuts",keys:["akhrot","walnut"],price:800,vrat:true}
          ]
        },
        { nameHi:"७. डेयरी और बेकरी", nameEn:"7. Dairy & Bakery", emoji:"🥛",
          items:[
            {id:601,nameHi:"दूध",nameEn:"Milk",keys:["dudh","milk"],price:65,vrat:true},
            {id:602,nameHi:"दही",nameEn:"Curd (Dahi)",keys:["dahi","curd"],price:80,vrat:true},
            {id:603,nameHi:"पनीर",nameEn:"Paneer",keys:["paneer"],price:350,vrat:true},
            {id:604,nameHi:"मक्खन (Butter)",nameEn:"Butter",keys:["butter","makhan"],price:500,vrat:false},
            {id:605,nameHi:"ब्रेड",nameEn:"Bread",keys:["bread","bred"],price:50,vrat:false},
            {id:606,nameHi:"अंडे",nameEn:"Eggs",keys:["ande","eggs"],price:7,vrat:false},
            {id:607,nameHi:"टोमैटो सॉस / जैम",nameEn:"Tomato Sauce / Jam",keys:["sauce","ketchup","jam"],price:120,vrat:false}
          ]
        },
        { nameHi:"८. सफाई और पर्सनल केयर", nameEn:"8. Cleaning & Personal Care", emoji:"🧴",
          items:[
            {id:701,nameHi:"नहाने का साबुन",nameEn:"Bathing Soap",keys:["sabun","soap","lux","dettol soap"],price:40,vrat:false},
            {id:702,nameHi:"शैम्पू / कंडीशनर",nameEn:"Shampoo / Conditioner",keys:["shampoo","conditioner"],price:150,vrat:false},
            {id:703,nameHi:"टूथपेस्ट / ब्रश",nameEn:"Toothpaste / Brush",keys:["toothpaste","colgate","brush"],price:100,vrat:false},
            {id:704,nameHi:"कपड़े धोने का सर्फ",nameEn:"Detergent Powder",keys:["surf","detergent","powder","tide","ariel"],price:120,vrat:false},
            {id:705,nameHi:"बर्तन साबुन / जूना",nameEn:"Dishwash / Scrubber",keys:["vim","bartan sabun","juna"],price:50,vrat:false},
            {id:706,nameHi:"फर्श / टॉयलेट क्लीनर",nameEn:"Floor / Toilet Cleaner",keys:["lizol","phenyl","harpic","toilet cleaner"],price:180,vrat:false},
            {id:707,nameHi:"फेसवाश",nameEn:"Face Wash",keys:["facewash","face wash","himalaya"],price:120,vrat:false},
            {id:708,nameHi:"शेविंग क्रीम / रेज़र",nameEn:"Shaving Cream & Razor",keys:["shaving cream","razor","blade","gillette"],price:100,vrat:false},
            {id:709,nameHi:"हेयर ऑइल",nameEn:"Hair Oil",keys:["hair oil","tel","parachute"],price:80,vrat:false},
            {id:710,nameHi:"डियो / परफ्यूम",nameEn:"Deodorant / Perfume",keys:["deo","perfume","fog","spray"],price:200,vrat:false},
            {id:711,nameHi:"बॉडी लोशन",nameEn:"Body Lotion",keys:["body lotion","cream","vaseline"],price:150,vrat:false}
          ]
        },
        { nameHi:"९. व्रत का विशेष सामान", nameEn:"9. Fasting Specials", emoji:"🪔",
          items:[
            {id:1101,nameHi:"कुट्टू / सिंघाड़े का आटा",nameEn:"Kuttu / Singhara Flour",keys:["kuttu","singhara"],price:120,vrat:true},
            {id:1102,nameHi:"नारियल",nameEn:"Coconut",keys:["nariyal","gola","coconut"],price:50,vrat:true},
            {id:1103,nameHi:"साबुदाना",nameEn:"Sabudana",keys:["sabudana"],price:80,vrat:true},
            {id:1104,nameHi:"मखाना",nameEn:"Makhana",keys:["makhana"],price:800,vrat:true},
            {id:1105,nameHi:"मूंगफली के दाने",nameEn:"Peanuts",keys:["mungfali"],price:140,vrat:true}
          ]
        },
        { nameHi:"१०. पूजा एवं अन्य", nameEn:"10. Pooja & Misc", emoji:"🙏",
          items:[
            {id:801,nameHi:"माचिस / लाइटर",nameEn:"Matchbox / Lighter",keys:["machis","matchbox","lighter"],price:10,vrat:true},
            {id:802,nameHi:"अगरबत्ती / धूप",nameEn:"Agarbatti / Dhoop",keys:["agarbatti","dhoop"],price:50,vrat:true},
            {id:803,nameHi:"कपूर / रुई बत्ती",nameEn:"Camphor / Cotton Wicks",keys:["kapoor","rui"],price:40,vrat:true},
            {id:805,nameHi:"मच्छर कॉइल / मशीन",nameEn:"Mosquito Repellent",keys:["machar","coil","allout","goodnight"],price:80,vrat:false},
            {id:806,nameHi:"मोली / कलावा",nameEn:"Sacred Thread (Kalawa)",keys:["moli","kalawa","dhaga"],price:20,vrat:true},
            {id:807,nameHi:"रोली / सिन्दूर",nameEn:"Roli / Sindoor",keys:["roli","sindoor","kumkum"],price:20,vrat:true},
            {id:808,nameHi:"हवन सामग्री",nameEn:"Hawan Samagri",keys:["hawan","samagri"],price:100,vrat:true},
            {id:809,nameHi:"प्रसाद (बताशे/मिश्री)",nameEn:"Prasad (Batashe)",keys:["prasad","batashe","mishri"],price:50,vrat:true}
          ]
        },
        { nameHi:"११. मेडिकल (फर्स्ट-एड)", nameEn:"11. Medical & First Aid", emoji:"🩺",
          items:[
            {id:901,nameHi:"डिटॉल / सैवलॉन",nameEn:"Dettol / Savlon",keys:["dettol","savlon"],price:70,vrat:false},
            {id:902,nameHi:"रुई (Cotton Roll)",nameEn:"Cotton Roll",keys:["cotton","rui roll"],price:30,vrat:false},
            {id:903,nameHi:"बैंड-एड / पेनकिलर",nameEn:"Band-aid / Painkiller",keys:["bandaid","patti","paracetamol","medicine"],price:40,vrat:false}
          ]
        },
        { nameHi:"१२. बच्चों का सामान", nameEn:"12. Baby Care", emoji:"👶",
          items:[
            {id:1001,nameHi:"बच्चों के डायपर",nameEn:"Baby Diapers",keys:["diaper","pampers","mamy poko"],price:400,vrat:false},
            {id:1002,nameHi:"बेबी सोप / पाउडर",nameEn:"Baby Soap / Powder",keys:["baby soap","johnson","baby powder"],price:150,vrat:false},
            {id:1003,nameHi:"बेबी वाइप्स",nameEn:"Baby Wipes",keys:["wipes","baby wipes"],price:120,vrat:false}
          ]
        },
        { nameHi:"१३. महिलाओं का सामान", nameEn:"13. Women's Cosmetics", emoji:"💄",
          items:[
            {id:1201,nameHi:"सेनेटरी पैड्स",nameEn:"Sanitary Pads",keys:["pads","sanitary","whisper","stayfree"],price:90,vrat:false},
            {id:1202,nameHi:"बिंदी / मेहंदी",nameEn:"Bindi / Mehndi",keys:["bindi","mehndi","henna"],price:50,vrat:false},
            {id:1203,nameHi:"हेयर कलर / डाई",nameEn:"Hair Color / Dye",keys:["hair color","dye","godrej"],price:150,vrat:false}
          ]
        },
        { nameHi:"१४. घरेलू फुटकर", nameEn:"14. Misc Household", emoji:"🏠",
          items:[
            {id:1301,nameHi:"बल्ब / ट्यूबलाइट",nameEn:"LED Bulb",keys:["bulb","led","tubelight"],price:100,vrat:false},
            {id:1302,nameHi:"घड़ी के सेल (Battery)",nameEn:"Batteries",keys:["cell","battery"],price:50,vrat:false},
            {id:1303,nameHi:"सुई-धागा / सेलो टेप",nameEn:"Needle, Thread, Tape",keys:["sui","dhaga","tape"],price:30,vrat:false}
          ]
        },
        { nameHi:"१५. स्टेशनरी", nameEn:"15. Stationery Items", emoji:"✏️",
          items:[
            {id:1401,nameHi:"पेन (नीला/काला)",nameEn:"Pen (Blue/Black)",keys:["pen","ball pen","gel pen"],price:10,vrat:false},
            {id:1402,nameHi:"पेंसिल",nameEn:"Pencil",keys:["pencil","apsara","natraj"],price:5,vrat:false},
            {id:1403,nameHi:"इरेज़र (रबर)",nameEn:"Eraser",keys:["eraser","rubber"],price:5,vrat:false},
            {id:1404,nameHi:"शार्पनर (कटर)",nameEn:"Sharpener",keys:["sharpener","cutter"],price:5,vrat:false},
            {id:1405,nameHi:"स्केल (रूलर)",nameEn:"Scale / Ruler",keys:["scale","ruler"],price:15,vrat:false},
            {id:1406,nameHi:"नोटबुक / कॉपी",nameEn:"Notebook / Copy",keys:["notebook","copy","register"],price:40,vrat:false},
            {id:1407,nameHi:"ड्रॉइंग बुक / कलर्स",nameEn:"Drawing Book & Colors",keys:["drawing book","colors","crayon","sketch pen"],price:50,vrat:false},
            {id:1408,nameHi:"फेविकोल / ग्लू स्टिक",nameEn:"Glue / Fevicol",keys:["fevicol","glue","gum","glue stick"],price:20,vrat:false},
            {id:1409,nameHi:"ए४ साइज पेपर",nameEn:"A4 Size Paper",keys:["a4 paper","xerox paper","print paper"],price:250,vrat:false},
            {id:1410,nameHi:"हाइलाइटर / मार्कर",nameEn:"Highlighter / Marker",keys:["highlighter","marker"],price:25,vrat:false}
          ]
        },
        { nameHi:"१६. किचन पैकिंग", nameEn:"16. Kitchen Essentials", emoji:"🏪",
          items:[
            {id:1501,nameHi:"फॉयल पेपर (Aluminium)",nameEn:"Aluminium Foil",keys:["foil paper","aluminium foil"],price:80,vrat:false},
            {id:1502,nameHi:"टिशू पेपर",nameEn:"Tissue Paper",keys:["tissue paper","napkin"],price:50,vrat:false},
            {id:1503,nameHi:"किचन रोल / टॉवल",nameEn:"Kitchen Towel",keys:["kitchen roll","towel","kitchen towel"],price:100,vrat:false},
            {id:1504,nameHi:"बटर पेपर",nameEn:"Butter Paper",keys:["butter paper","parchment paper"],price:60,vrat:false},
            {id:1505,nameHi:"कचरे की थैली",nameEn:"Garbage Bags",keys:["polythene","kachra bag","garbage bag"],price:80,vrat:false}
          ]
        }
    ];

    const units = {
        hi: ["किलो (Kg)","ग्राम (g)","लीटर (L)","पैकेट","पीस","दर्जन"],
        en: ["Kg","Gram","Liter","Packet","Piece","Dozen"]
    };
    const valOptions = ["0","½","1","2","3","4","5","6","7","8","9","10","50","100","200","250","500"];

    // Popular quick-add items
    const quickItems = [1,3,101,308,501,601,603,304];

    function getSmartDefaults(nameEn) {
        let name = nameEn.toLowerCase();
        let uIndex = 0; let defaultVal = "1";
        if(name.includes("soap")||name.includes("brush")||name.includes("lemon")||name.includes("bulb")||name.includes("battery")||name.includes("bag")||name.includes("razor")||name.includes("paste")||name.includes("cream")||name.includes("deo")||name.includes("pad")||name.includes("diaper")||name.includes("wipes")||name.includes("pen")||name.includes("eraser")||name.includes("sharpener")||name.includes("scale")||name.includes("notebook")||name.includes("glue")||name.includes("marker")||name.includes("foil")||name.includes("tissue")||name.includes("towel")) { uIndex=4; }
        else if(name.includes("banana")||name.includes("egg")) { uIndex=5; }
        else if(name.includes("sauce")||name.includes("milk")||name.includes("oil")||name.includes("cleaner")||name.includes("liquid")||name.includes("wash")||name.includes("lotion")||name.includes("shampoo")||name.includes("vinegar")||name.includes("phenyl")) { uIndex=2; }
        else if(name.includes("powder")||name.includes("tea")||name.includes("coffee")||name.includes("spice")||name.includes("masala")||name.includes("coriander")||name.includes("essence")||name.includes("cumin")||name.includes("pepper")||name.includes("asafoetida")||name.includes("saffron")||name.includes("dry fruits")||name.includes("pistachio")||name.includes("walnut")||name.includes("fig")||name.includes("dates")||name.includes("makhana")) { uIndex=1; defaultVal="250"; }
        else if(name.includes("biscuit")||name.includes("maggi")||name.includes("noodles")||name.includes("namkeen")||name.includes("chips")||name.includes("surf")||name.includes("detergent")||name.includes("cotton")) { uIndex=3; }
        return { uIndex, val: defaultVal };
    }

    let allItems = [];
    let appState = {};

    categoryData.forEach(cat => {
        cat.items.forEach(item => {
            allItems.push(item);
            let smart = getSmartDefaults(item.nameEn);
            appState[item.id] = { checked:false, val:"0", unitHi:units.hi[smart.uIndex], unitEn:units.en[smart.uIndex], smartVal:smart.val };
        });
    });

    // ===== LANG TOGGLE =====
    window.toggleLang = function() {
        lang = lang==='hi'?'en':'hi';
        const t = uiTexts[lang];
        document.getElementById('langBtn').innerText = t.switchLangBtn;
        document.getElementById('vratBtnText').innerText = vratMode ? t.vratBtnOn : t.vratBtnOff;
        document.getElementById('mainTitle').innerText = t.mainTitle;
        document.getElementById('subTitle').innerText = t.subTitle;
        document.getElementById('aiBoxTitle').innerText = t.aiBoxTitle;
        document.getElementById('voiceBtnText').innerText = t.voiceBtnReady;
        document.getElementById('aiTextInput').placeholder = t.aiInputPlaceholder;
        document.getElementById('aiBtnText').innerText = t.aiBtn;
        document.getElementById('bagTitle').innerText = t.bagTitle;
        document.getElementById('budgetText').innerText = t.budgetText;
        document.getElementById('speakBtnText').innerHTML = `🔊 ${t.speakBtn}`;
        document.getElementById('waBtnText').innerHTML = `📱 ${t.waBtn}`;
        document.getElementById('printBtnText').innerHTML = `📝 ${t.printBtn}`;
        document.getElementById('addCustomBtnText').innerHTML = `➕ ${t.addCustomBtn}`;
        document.getElementById('printSubTitle').innerText = t.printSubTitle;
        document.getElementById('backBtnText').innerText = t.backBtn;
        document.getElementById('loginBtnText').innerText = t.loginBtn;
        document.getElementById('logoutBtnText').innerText = t.logoutBtn;
        document.getElementById('globalSearch').placeholder = t.searchPlaceholder;
        if(window.currentUserName) document.getElementById('userInfo').innerText = `${t.helloText}, ${window.currentUserName}!`;
        const cards = t.featureCards || [];
        cards.forEach((card, index) => {
            const titleEl = document.getElementById(`featureTitle${index+1}`);
            const descEl = document.getElementById(`featureDesc${index+1}`);
            if(titleEl) titleEl.innerText = card.title;
            if(descEl) descEl.innerText = card.desc;
        });
        renderCategories();
    }

    // ===== VRAT MODE =====
    window.toggleVratMode = function() {
        vratMode = !vratMode;
        document.getElementById('vratBtnText').innerText = vratMode ? uiTexts[lang].vratBtnOn : uiTexts[lang].vratBtnOff;
        const btn = document.getElementById('vratBtn');
        if(vratMode) { btn.classList.remove('bg-purple-50','text-purple-700','hover:bg-purple-100'); btn.classList.add('bg-purple-600','text-white','hover:bg-purple-700'); }
        else { btn.classList.remove('bg-purple-600','text-white','hover:bg-purple-700'); btn.classList.add('bg-purple-50','text-purple-700','hover:bg-purple-100'); }
        renderCategories();
    }

    // ===== STATE SAVE (debounced) =====
    window.saveState = function() {
        localStorage.setItem('kiranaStateV6', JSON.stringify(appState));
        // Debounced cloud sync — prevents quota exhaustion from rapid taps
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => { if(window.saveToCloud) window.saveToCloud(appState); }, 1800);
    }
    window.loadState = function() {
        let saved = localStorage.getItem('kiranaStateV6') || localStorage.getItem('kiranaStateV5');
        if(saved) {
            let p = JSON.parse(saved);
            Object.keys(p).forEach(k => { if(appState[k]) appState[k] = p[k]; });
        }
    }

    // ===== SEARCH =====
    window.searchItems = function(q) {
        searchQuery = q.toLowerCase().trim();
        renderCategories();
        const scrollBtn = document.getElementById('scrollTopBtn');
        if(searchQuery) { scrollBtn.classList.add('visible'); }
    }

    function matchesSearch(item) {
        if(!searchQuery) return true;
        const keys = [item.nameHi.toLowerCase(), item.nameEn.toLowerCase(), ...item.keys];
        return keys.some(k => k.includes(searchQuery));
    }

    function highlightText(text) {
        if(!searchQuery) return text;
        const re = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(re, '<mark class="search-highlight">$1</mark>');
    }

    // ===== RENDER CATEGORIES =====
    window.renderCategories = function() {
        const container = document.getElementById('categoriesContainer');
        const skeleton = document.getElementById('skeletonContainer');
        const categoryImages = [
            './images/categories/vegetables.svg',
            './images/categories/grains.svg',
            './images/categories/pulses.svg',
            './images/categories/dairy.svg',
            './images/categories/household.svg'
        ];
        container.innerHTML = '';
        if(skeleton) skeleton.style.display = 'none';
        let currentUnits = units[lang];
        let totalShown = 0;

        categoryData.forEach((category, catIdx) => {
            let catItems = category.items;
            if(vratMode) catItems = catItems.filter(i => i.vrat);
            if(searchQuery) catItems = catItems.filter(matchesSearch);
            if(catItems.length === 0) return;
            totalShown += catItems.length;

            let catName = lang==='hi' ? category.nameHi : category.nameEn;
            let checkedCount = catItems.filter(i => appState[i.id] && appState[i.id].checked).length;
            let catEl = document.createElement('div');
            catEl.className = `bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden fade-up cat-accent-${catIdx % 16}`;

            let headerHTML = `
              <div class="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer" onclick="toggleCat(this)">
                <div class="flex items-center gap-3">
                  <img src="${categoryImages[catIdx % categoryImages.length]}" alt="" class="w-12 h-10 object-cover rounded-xl" loading="lazy">
                  <div>
                    <h2 class="text-base font-black text-slate-800 leading-tight">${catName}</h2>
                    <p class="text-xs text-slate-400 mt-0.5">${catItems.length} आइटम${checkedCount > 0 ? ` • <span class="text-orange-500 font-bold">${checkedCount} चुने</span>` : ''}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  ${checkedCount > 0 ? `<span class="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">${checkedCount}</span>` : ''}
                  <span class="text-slate-400 text-sm cat-chevron">▼</span>
                </div>
              </div>
            `;

            let itemsHTML = '<div class="cat-body p-4 grid grid-cols-1 md:grid-cols-2 gap-3">';
            catItems.forEach(item => {
                const state = appState[item.id];
                const isChecked = state && state.checked;
                const itemName = lang==='hi' ? item.nameHi : item.nameEn;
                const displayName = highlightText(itemName);
                const currentUnit = lang==='hi' ? (state ? state.unitHi : units.hi[0]) : (state ? state.unitEn : units.en[0]);

                itemsHTML += `
                  <div id="card-${item.id}" class="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-2 rounded-2xl smooth gap-2 ${isChecked ? 'item-checked border-orange-400' : 'bg-white border-slate-200 hover:border-orange-300'}">
                    <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <div class="relative flex-shrink-0">
                        <input type="checkbox" id="check-${item.id}" ${isChecked?'checked':''} onchange="toggleItem(${item.id})" class="peer w-6 h-6 appearance-none border-2 border-slate-300 rounded-lg checked:bg-orange-500 checked:border-orange-500 smooth cursor-pointer">
                        <svg class="absolute inset-0 m-auto w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span class="text-sm font-bold text-slate-700 hover:text-orange-600 smooth leading-snug truncate">${displayName}</span>
                    </label>
                    <div class="flex gap-2 flex-shrink-0">
                      <select id="val-${item.id}" onchange="updateQty(${item.id})" class="p-1.5 text-xs font-bold border-2 border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-orange-400 w-14 text-center smooth">
                        ${valOptions.map(v=>`<option value="${v}" ${state&&state.val===v?'selected':''}>${v}</option>`).join('')}
                      </select>
                      <select id="unit-${item.id}" onchange="updateQty(${item.id})" class="p-1.5 text-xs font-bold border-2 border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-orange-400 w-20 smooth">
                        ${currentUnits.map((u,idx)=>`<option value="${idx}" ${currentUnit===u?'selected':''}>${u}</option>`).join('')}
                      </select>
                    </div>
                  </div>`;
            });
            itemsHTML += '</div>';

            catEl.innerHTML = headerHTML + itemsHTML;
            container.appendChild(catEl);
        });

        if(totalShown === 0 && searchQuery) {
            container.innerHTML = `<div class="text-center py-12 text-slate-400"><div class="text-5xl mb-3">🔍</div><p class="font-bold text-lg">${uiTexts[lang].noResults}</p><p class="text-sm">"${searchQuery}" — खुद जोड़ें या दूसरा शब्द आज़माएं</p></div>`;
        }

        // Render quick-add chips when bag is empty
        renderQuickAdd();
        updateBag();
    }

    window.toggleCat = function(header) {
        const body = header.nextElementSibling;
        const chevron = header.querySelector('.cat-chevron');
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? '' : 'none';
        if(chevron) chevron.textContent = isHidden ? '▼' : '▶';
    }

    function renderQuickAdd() {
        const bag = document.getElementById('shoppingBagContainer');
        const checkedCount = allItems.filter(i => appState[i.id] && appState[i.id].checked).length;
        if(checkedCount > 0) return;
        const chips = quickItems.map(id => {
            const item = allItems.find(i => i.id === id);
            if(!item) return '';
            const name = lang==='hi' ? item.nameHi : item.nameEn;
            return `<span class="quick-chip" onclick="quickAdd(${id})">+ ${name}</span>`;
        }).join('');
        bag.innerHTML = `
            <div class="w-full py-3 text-center">
              <div class="text-3xl mb-2">🛒</div>
              <p class="text-slate-400 font-medium text-sm italic mb-3">${uiTexts[lang].emptyBag}</p>
              <p class="text-xs text-slate-500 font-semibold mb-2">${uiTexts[lang].quickAdd}</p>
              <div class="flex flex-wrap justify-center gap-2">${chips}</div>
            </div>`;
    }

    window.quickAdd = function(id) {
        appState[id].checked = true;
        if(appState[id].val === "0") appState[id].val = appState[id].smartVal || "1";
        renderCategories(); saveState();
    }

    // ===== TOGGLE ITEM =====
    window.toggleItem = function(id) {
        appState[id].checked = document.getElementById(`check-${id}`).checked;
        if(appState[id].checked) { if(appState[id].val==="0") appState[id].val = appState[id].smartVal||"1"; }
        else { appState[id].val = "0"; }
        const el = document.getElementById(`card-${id}`);
        if(el) {
            if(appState[id].checked) el.classList.add('item-checked','border-orange-400');
            else el.classList.remove('item-checked','border-orange-400');
        }
        if(document.getElementById(`val-${id}`)) document.getElementById(`val-${id}`).value = appState[id].val;
        updateBag(); saveState();
    }

    window.updateQty = function(id) {
        appState[id].val = document.getElementById(`val-${id}`).value;
        let uIdx = parseInt(document.getElementById(`unit-${id}`).value);
        appState[id].unitHi = units.hi[uIdx]; appState[id].unitEn = units.en[uIdx];
        if(appState[id].val === "0") { appState[id].checked = false; const cb = document.getElementById(`check-${id}`); if(cb) cb.checked = false; const el = document.getElementById(`card-${id}`); if(el){ el.classList.remove('item-checked','border-orange-400');} }
        else { appState[id].checked = true; const cb = document.getElementById(`check-${id}`); if(cb) cb.checked = true; const el = document.getElementById(`card-${id}`); if(el){ el.classList.add('item-checked','border-orange-400');} }
        updateBag(); saveState();
    }

    // ===== UPDATE BAG (with improved budget bar) =====
    window.updateBag = function() {
        const bag = document.getElementById('shoppingBagContainer');
        let checkedItems = allItems.filter(i => appState[i.id] && appState[i.id].checked);
        if(checkedItems.length === 0) { renderQuickAdd(); document.getElementById('estTotal').innerText = `${uiTexts[lang].estBill} 0`; document.getElementById('pdfEstTotal').innerText = `${uiTexts[lang].estBill} 0`; document.getElementById('budgetBarWrap').classList.add('hidden'); return; }

        let totalBill = 0;
        let userBudget = parseFloat(document.getElementById('budgetInput').value) || 0;
        let html = '';

        checkedItems.forEach(item => {
            let unitUsed = lang==='hi' ? appState[item.id].unitHi : appState[item.id].unitEn;
            let itemName = lang==='hi' ? item.nameHi : item.nameEn;
            let num = appState[item.id].val==="½" ? 0.5 : parseFloat(appState[item.id].val);
            let itemTotal = (appState[item.id].unitEn==="Gram" ? (num/1000) : num) * (item.price||0);
            totalBill += itemTotal;

            html += `<div class="bag-item bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center gap-2 shadow-sm w-full smooth hover:border-orange-300">
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-slate-700 text-sm leading-tight truncate">${itemName}</p>
                  <p class="text-xs text-slate-400 mt-0.5">₹${item.price} / ${unitUsed}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <div class="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5 gap-1">
                    <button class="qty-btn" onclick="changeQtyInBag(${item.id},-1)" aria-label="कम करें">−</button>
                    <span class="px-2 text-sm font-bold text-slate-800 min-w-[36px] text-center">${appState[item.id].val}</span>
                    <button class="qty-btn" onclick="changeQtyInBag(${item.id},1)" aria-label="बढ़ाएं">+</button>
                  </div>
                  <span class="text-sm font-black text-emerald-600 w-14 text-right">₹${Math.round(itemTotal)}</span>
                  <button onclick="removeFromBag(${item.id})" class="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white smooth text-sm" aria-label="हटाएं">🗑️</button>
                </div>
              </div>`;
        });
        bag.innerHTML = html;

        const totalRound = Math.round(totalBill);
        document.getElementById('estTotal').innerText = `${uiTexts[lang].estBill} ${totalRound.toLocaleString('hi-IN')}`;
        document.getElementById('pdfEstTotal').innerText = `${uiTexts[lang].estBill} ${totalRound.toLocaleString('hi-IN')}`;

        // Budget bar
        if(userBudget > 0) {
            document.getElementById('budgetBarWrap').classList.remove('hidden');
            const pct = Math.min(100, (totalBill / userBudget) * 100);
            const fill = document.getElementById('budgetBarFill');
            fill.style.width = pct + '%';
            fill.className = `budget-bar-fill ${pct < 70 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-rose-500'}`;
            document.getElementById('budgetBarLabel').innerText = `${uiTexts[lang].budgetLabel} ₹${totalRound.toLocaleString('hi-IN')} / ₹${userBudget.toLocaleString('hi-IN')} (${Math.round(pct)}%)`;
            if(totalBill > userBudget) { document.getElementById('budgetWarning').classList.remove('hidden'); document.getElementById('estTotal').classList.replace('text-emerald-600','text-rose-600'); }
            else { document.getElementById('budgetWarning').classList.add('hidden'); document.getElementById('estTotal').classList.replace('text-rose-600','text-emerald-600'); }
        } else {
            document.getElementById('budgetBarWrap').classList.add('hidden');
            document.getElementById('budgetWarning').classList.add('hidden');
            document.getElementById('estTotal').classList.replace('text-rose-600','text-emerald-600');
        }
    }

    window.removeFromBag = function(id) {
        appState[id].checked = false; appState[id].val = "0";
        const cb = document.getElementById(`check-${id}`); if(cb) cb.checked = false;
        const el = document.getElementById(`card-${id}`); if(el){ el.classList.remove('item-checked','border-orange-400'); }
        updateBag(); saveState();
    }

    window.changeQtyInBag = function(id, change) {
        let idx = valOptions.indexOf(appState[id].val);
        if(change > 0 && idx < valOptions.length-1) appState[id].val = valOptions[idx+1];
        else if(change < 0 && idx > 0) appState[id].val = valOptions[idx-1];
        if(appState[id].val === "0") { appState[id].checked = false; const el = document.getElementById(`card-${id}`); if(el){ el.classList.remove('item-checked','border-orange-400');} }
        const sel = document.getElementById(`val-${id}`); if(sel) sel.value = appState[id].val;
        updateBag(); saveState();
    }

    window.clearBag = function() {
        showCustomConfirm(lang==='hi'?'थैला खाली करें?':'Clear Bag?', lang==='hi'?'क्या आप सच में पूरा थैला खाली करना चाहते हैं?':'Are you sure you want to clear the bag?', () => {
            Object.keys(appState).forEach(k => { appState[k].checked = false; appState[k].val = "0"; });
            saveState(); renderCategories();
        });
    }

    // ===== VOICE =====
    window.speakBag = function() {
        if(!('speechSynthesis' in window)) { showCustomAlert("त्रुटि", uiTexts[lang].voiceNotSupported, "error"); return; }
        window.speechSynthesis.cancel();
        let text = lang==='hi' ? "आपके थैले में है: " : "In your bag: ";
        let count = 0;
        allItems.forEach(item => {
            if(appState[item.id].checked) {
                count++;
                let n = lang==='hi' ? item.nameHi : item.nameEn;
                let u = lang==='hi' ? appState[item.id].unitHi.split(' ')[0] : appState[item.id].unitEn;
                let v = appState[item.id].val==="½" ? (lang==='hi'?'आधा':'half') : appState[item.id].val;
                text += `${v} ${u} ${n}, `;
            }
        });
        if(count === 0) text = lang==='hi' ? 'थैला खाली है।' : 'Bag is empty.';
        else { let bill = document.getElementById('estTotal').innerText.replace(/[^0-9]/g,''); text += lang==='hi' ? `अंदाज़न बिल ${bill} रुपये।` : `estimated bill ${bill} rupees.`; }
        let u = new SpeechSynthesisUtterance(text);
        u.lang = lang==='hi' ? 'hi-IN' : 'en-US'; u.rate = 0.9;
        window.speechSynthesis.speak(u);
    }

    // ===== VOICE INPUT =====
    window.startVoice = function() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SpeechRec) { showCustomAlert("त्रुटि", uiTexts[lang].voiceNotSupported, "error"); return; }
        const recognition = new SpeechRec();
        recognition.lang = lang==='hi' ? 'hi-IN' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        const btn = document.getElementById('voiceBtnText');
        recognition.onstart = () => {
            btn.innerText = uiTexts[lang].voiceBtnListening;
            btn.parentElement.classList.replace('bg-slate-50','bg-red-50');
            btn.parentElement.classList.add('border-red-400');
        };
        recognition.onresult = (e) => {
            document.getElementById('aiTextInput').value += " " + e.results[0][0].transcript;
            processText();
        };
        recognition.onerror = (e) => {
            btn.innerText = uiTexts[lang].voiceBtnReady;
            btn.parentElement.classList.replace('bg-red-50','bg-slate-50');
            btn.parentElement.classList.remove('border-red-400');
            showCustomAlert("वॉइस एरर", e.error || "Voice recognition failed.", "error");
        };
        recognition.onend = () => {
            btn.innerText = uiTexts[lang].voiceBtnReady;
            btn.parentElement.classList.replace('bg-red-50','bg-slate-50');
            btn.parentElement.classList.remove('border-red-400');
        };
        recognition.start();
    }

    // ===== AI TEXT =====
    window.processText = function() {
        let text = document.getElementById('aiTextInput').value.toLowerCase();
        if(!text.trim()) return;
        let found = 0;
        allItems.forEach(item => {
            let keys = [item.nameHi.toLowerCase(), item.nameEn.toLowerCase(), ...item.keys];
            let matched = false;
            keys.forEach(key => {
                if(!matched && text.includes(key.toLowerCase())) {
                    appState[item.id].checked = true;
                    let rx = new RegExp(`(\\d+|½|आधा|एक|दो|तीन|चार|पांच|दस)\\s*(kg|kilo|g|gram|ltr|liter|pkt|packet|pc|piece|किलो|ग्राम|पैकेट|लीटर)?\\s*${key}`, 'i');
                    let ex = text.match(rx);
                    if(ex) {
                        if(ex[1]) { let v=ex[1]; const hn={"आधा":"½","एक":"1","दो":"2","तीन":"3","चार":"4","पांच":"5","दस":"10"}; if(hn[v]) v=hn[v]; if(valOptions.includes(v)) appState[item.id].val=v; }
                        if(ex[2]) { let u=ex[2].toLowerCase(); let uI=0; if(u.includes('g')||u.includes('ग्राम')) uI=1; if(u.includes('l')||u.includes('लीटर')) uI=2; if(u.includes('p')||u.includes('पैकेट')) uI=3; appState[item.id].unitHi=units.hi[uI]; appState[item.id].unitEn=units.en[uI]; }
                    }
                    if(appState[item.id].val==="0") appState[item.id].val = appState[item.id].smartVal||"1";
                    matched=true; found++;
                }
            });
        });
        renderCategories(); saveState();
        if(found>0) { showCustomAlert("शानदार!", uiTexts[lang].aiSuccess,"success"); document.getElementById('aiTextInput').value=''; }
        else showCustomAlert("त्रुटि", uiTexts[lang].aiFail,"error");
    }

    // ===== AUTOCOMPLETE =====
    document.getElementById('aiTextInput').addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        const box = document.getElementById('autoSuggest');
        if(!q || q.length < 2) { box.classList.add('hidden'); return; }
        const matches = allItems.filter(i => {
            const keys = [i.nameHi.toLowerCase(), i.nameEn.toLowerCase(), ...i.keys];
            return keys.some(k => k.includes(q));
        }).slice(0,6);
        if(!matches.length) { box.classList.add('hidden'); return; }
        box.innerHTML = matches.map(i => {
            const n = lang==='hi' ? i.nameHi : i.nameEn;
            return `<div class="px-4 py-2.5 hover:bg-orange-50 cursor-pointer text-sm font-semibold text-slate-700 border-b border-slate-100 last:border-0 smooth" onclick="autoFill('${n}')">${n}</div>`;
        }).join('');
        box.classList.remove('hidden');
    });
    document.addEventListener('click', e => { if(!e.target.closest('#aiTextInput')&&!e.target.closest('#autoSuggest')) document.getElementById('autoSuggest').classList.add('hidden'); });
    window.autoFill = function(name) {
        document.getElementById('aiTextInput').value = name;
        document.getElementById('autoSuggest').classList.add('hidden');
        processText();
    }

    // ===== AI BILL SCAN =====
    window.handleBillImage = async function(event) {
        const file = event.target.files[0];
        event.target.value = '';
        if(!file) return;
        document.getElementById('aiLoadingOverlay').classList.remove('hidden');
        try {
            if(!GEMINI_API_KEY || GEMINI_API_KEY === "") {
                document.getElementById('aiLoadingOverlay').classList.add('hidden');
                showCustomAlert("API कुंजी गायब है", "कृपया public/env.js में GEMINI_API_KEY जोड़ें।", "error");
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async function() {
                const b64 = reader.result.split(',')[1];
                const body = { contents:[{ parts:[{ text:"You are a grocery list assistant. Read this bill image carefully. Return ONLY a comma-separated list of grocery item names in Hindi. Example: 'चीनी, चाय पत्ती, आटा, दूध'. Only item names, no quantities, no prices, no extra text." }, { inline_data:{ mime_type:file.type, data:b64 } }] }] };
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
                const data = await r.json();
                document.getElementById('aiLoadingOverlay').classList.add('hidden');
                if(!r.ok) {
                    const err = data.error?.message || `${r.status} ${r.statusText}`;
                    showCustomAlert("स्कैन विफल", err, "error");
                    return;
                }
                if(data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    document.getElementById('aiTextInput').value = data.candidates[0].content.parts[0].text;
                    showCustomAlert("स्कैन सफल! ✅","अब नीचे 'जोड़ें' बटन दबाएं।","success");
                } else showCustomAlert("त्रुटि","AI बिल नहीं पढ़ पाया। साफ़ फोटो खींचें।","error");
            };
        } catch(e) {
            document.getElementById('aiLoadingOverlay').classList.add('hidden');
            showCustomAlert("खराबी", e.message || "कुछ तकनीकी खराबी आई।", "error");
        }
    }

    // ===== CUSTOM ITEM =====
    window.addNewCustomItem = function() {
        showCustomPrompt("नया सामान", uiTexts[lang].newCustomPrompt, "सामान का नाम...", (name) => {
            const id = Date.now();
            const item = { id, nameHi:name.trim(), nameEn:name.trim(), keys:[], price:50, vrat:false };
            categoryData[0].items.unshift(item);
            allItems.push(item);
            appState[id] = { checked:true, val:"1", unitHi:"पैकेट", unitEn:"Packet", smartVal:"1" };
            renderCategories(); saveState();
            showCustomAlert("सफल", uiTexts[lang].customAdded, "success");
        });
    }

    // ===== WHATSAPP =====
    window.shareOnWhatsApp = function() {
        let text = lang==='hi' ? "🛒 *मेरी किराना लिस्ट (प्रज्ञासूची)*\n\n" : "🛒 *My Grocery List (PragyaSuchi)*\n\n";
        let total = 0;
        categoryData.forEach(cat => {
            let ci = cat.items.filter(i => appState[i.id]&&appState[i.id].checked);
            if(ci.length>0) {
                text += `*_${lang==='hi'?cat.nameHi:cat.nameEn}_*\n`;
                ci.forEach(item => {
                    let n = lang==='hi'?item.nameHi:item.nameEn;
                    let u = lang==='hi'?appState[item.id].unitHi:appState[item.id].unitEn;
                    text += `• ${n} — ${appState[item.id].val} ${u}\n`; total++;
                }); text += "\n";
            }
        });
        if(total===0) { showCustomAlert("थैला खाली",uiTexts[lang].bagEmptyAlert,"error"); return; }
        let bill = document.getElementById('estTotal').innerText.replace(/[^0-9]/g,'');
        text += `💰 *अंदाज़न बिल:* ₹${bill}\n_PragyaSuchi App से भेजा गया_ 🙏`;
        window.open("https://wa.me/?text="+encodeURIComponent(text),'_blank');
    }

    // ===== PRINT / PDF (improved receipt) =====
    window.openPrintView = function() {
        const container = document.getElementById('pdfTableContainer');
        container.innerHTML = ''; let totalCount = 0; let totalBill = 0;
        categoryData.forEach(cat => {
            let ci = cat.items.filter(i => appState[i.id]&&appState[i.id].checked);
            if(ci.length>0) {
                let catName = lang==='hi'?cat.nameHi:cat.nameEn;
                let tbl = `<div style="margin-top:16px"><h3 style="font-size:14px;font-weight:900;margin-bottom:8px;padding:6px 8px;background:#f1f5f9;border-radius:8px">${cat.emoji} ${catName}</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px"><thead><tr style="background:#1e293b;color:white"><th style="padding:6px 8px;text-align:left;border-radius:0;width:40%">${lang==='hi'?'सामान':'Item'}</th><th style="padding:6px 8px;text-align:center;width:30%">${lang==='hi'?'मात्रा':'Qty'}</th><th style="padding:6px 8px;text-align:right;width:30%">${lang==='hi'?'अंदाज़न':'Est.'}</th></tr></thead><tbody>`;
                ci.forEach((item,idx) => {
                    let n = lang==='hi'?item.nameHi:item.nameEn;
                    let u = lang==='hi'?appState[item.id].unitHi:appState[item.id].unitEn;
                    let num = appState[item.id].val==="½"?0.5:parseFloat(appState[item.id].val);
                    let it = (appState[item.id].unitEn==="Gram"?(num/1000):num)*(item.price||0);
                    totalBill += it;
                    tbl += `<tr style="background:${idx%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #e2e8f0"><td style="padding:6px 8px;font-weight:700">${n}</td><td style="padding:6px 8px;text-align:center;font-weight:600">${appState[item.id].val} ${u}</td><td style="padding:6px 8px;text-align:right;font-weight:700;color:#16a34a">₹${Math.round(it)}</td></tr>`;
                    totalCount++;
                });
                tbl += '</tbody></table></div>';
                container.innerHTML += tbl;
            }
        });
        if(totalCount===0) { showCustomAlert("थैला खाली है",uiTexts[lang].bagEmptyAlert,"error"); return; }
        document.getElementById('pdfDate').innerText = `${uiTexts[lang].dateText} ${new Date().toLocaleDateString('hi-IN')}`;
        document.getElementById('pdfTotalCount').innerText = `${uiTexts[lang].totalItemsText} ${totalCount}`;
        document.getElementById('pdfEstTotal').innerText = `💰 ${lang==='hi'?'अंदाज़न बिल':'Est. Bill'}: ₹${Math.round(totalBill).toLocaleString('hi-IN')}`;
        document.querySelector('.no-print').style.display = 'none';
        document.getElementById('printArea').classList.remove('hidden');
        window.scrollTo(0,0);
    }
    window.closePrintView = function() { document.getElementById('printArea').classList.add('hidden'); document.querySelector('.no-print').style.display=''; }

    // ===== SCROLL TO TOP =====
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('scrollTopBtn');
        if(window.scrollY > 400) btn.classList.add('visible'); else btn.classList.remove('visible');
    });

    // ===== INIT =====
    window.onload = function() {
        loadState();
        // Show skeleton briefly for feel of loading
        setTimeout(() => { renderCategories(); }, 300);
    }

    // ===== PWA =====
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault(); deferredPrompt = e;
        document.getElementById('installAppBtn').classList.remove('hidden');
    });
    document.getElementById('installAppBtn').addEventListener('click', async () => {
        if(deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; document.getElementById('installAppBtn').classList.add('hidden'); }
    });
    window.addEventListener('appinstalled', () => document.getElementById('installAppBtn').classList.add('hidden'));
    if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
