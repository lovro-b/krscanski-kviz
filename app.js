document.addEventListener('DOMContentLoaded', () => {
    const qsContainer = document.getElementById('questions-container');
    const favContainer = document.getElementById('favorites-container');
    const searchInput = document.getElementById('search-input');
    const resultsCount = document.getElementById('results-count');
    const resetBtn = document.querySelector('.reset-btn');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const showFavBtn = document.getElementById('show-favorites-btn');
    const favCountSpan = document.getElementById('favorites-count');

    let questions = [];
    const allCategories = new Set();
    const favoriteQuestions = new Set(loadFavorites());
    let activeFilters = { difficulties: [], categories: [], searchQuery: '', sortBy: 'difficulty' };
    let showOnlyFavorites = false;

    fetch('vprasanja.json')
        .then(r => r.json())
        .then(data => {
            questions = data.map((q, i) => ({ ...q, id: q.id || i + 1 }));
            questions.forEach(q => q.kategorije.forEach(c => allCategories.add(c)));
            buildCategoryFilters();
            updateCounters();
            applyFilters();
            displayFavorites();
            setupEvents();
        })
        .catch(() => {
            qsContainer.innerHTML = `<div class="no-results">
                <i class="fas fa-exclamation-circle" style="font-size:3rem"></i>
                <h3>Napaka pri nalaganju vprašanj</h3>
            </div>`;
        });

    function loadFavorites() {
        try {
            return JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
        } catch {
            return [];
        }
    }
    function saveFavorites() {
        localStorage.setItem('favoriteQuestions', JSON.stringify([...favoriteQuestions]));
        favCountSpan.textContent = favoriteQuestions.size;
    }

    function buildCategoryFilters() {
        const catBox = document.getElementById('category-filters');
        catBox.innerHTML = `<div class="filter-option active">
            <input type="checkbox" id="category-all" checked>
            <label for="category-all">Vse kategorije</label>
            <span class="filter-count" id="count-category-all">0</span>
        </div>`;
        [...allCategories].sort().forEach(cat => {
            const safe = cat.replace(/\s+/g, '-');
            catBox.insertAdjacentHTML('beforeend', `
                <div class="filter-option">
                    <input type="checkbox" id="category-${safe}">
                    <label for="category-${safe}">${cat}</label>
                    <span class="filter-count" id="count-category-${safe}">0</span>
                </div>`);
        });
    }

    function updateCounters() {
        document.getElementById('count-difficulty-all').textContent = questions.length;
        for (let i = 1; i <= 5; i++)
            document.getElementById(`count-difficulty-${i}`).textContent = questions.filter(q => q.težavnost === i).length;
        document.getElementById('count-category-all').textContent = questions.length;
        allCategories.forEach(cat => {
            const cnt = questions.filter(q => q.kategorije.includes(cat)).length;
            document.getElementById(`count-category-${cat.replace(/\s+/g, '-')}`).textContent = cnt;
        });
    }

    function applyFilters() {
        let filtered = questions.filter(q => {
            if (showOnlyFavorites && !favoriteQuestions.has(q.id)) return false;
            if (activeFilters.difficulties.length && !activeFilters.difficulties.includes(q.težavnost)) return false;
            if (activeFilters.categories.length && !q.kategorije.some(c => activeFilters.categories.includes(c))) return false;
            if (activeFilters.searchQuery) {
                const sq = activeFilters.searchQuery.toLowerCase();
                if (!q.vprašanje.toLowerCase().includes(sq) && !q.odgovor.toLowerCase().includes(sq)) return false;
            }
            return true;
        });

        if (activeFilters.sortBy === 'difficulty') filtered.sort((a, b) => a.težavnost - b.težavnost);
        if (activeFilters.sortBy === 'alphabetical') filtered.sort((a, b) => a.vprašanje.localeCompare(b.vprašanje, 'sl'));

        displayQuestions(filtered);
    }

    function displayQuestions(list) {
        qsContainer.innerHTML = '';
        if (!list.length) {
            qsContainer.innerHTML = `<div class="no-results">
                <i class="fas fa-search" style="font-size:3rem"></i><h3>Ni ustreznih vprašanj</h3></div>`;
            return;
        }
        list.forEach(q => qsContainer.appendChild(makeCard(q, false)));
        resultsCount.textContent = list.length;
    }

    function displayFavorites() {
        const fav = questions.filter(q => favoriteQuestions.has(q.id));
        favContainer.innerHTML = '';
        if (!fav.length) {
            favContainer.innerHTML = `<div class="no-results">
                <i class="fas fa-heart" style="font-size:3rem;color:#ddd"></i><h3>Ni priljubljenih vprašanj</h3></div>`;
            return;
        }
        fav.forEach(q => favContainer.appendChild(makeCard(q, true)));
    }

    function makeCard(q, isFavList) {
        const card = document.createElement('div');
        card.className = `question-card difficulty-${q.težavnost}`;
        const fav = favoriteQuestions.has(q.id);
        card.innerHTML = `
            <div class="question-header">
                <div class="question-difficulty difficulty-badge-${q.težavnost}">Težavnost: ${q.težavnost}/5</div>
                <button class="favorite-btn ${fav ? 'active' : ''}"><i class="fas fa-heart"></i></button>
            </div>
            <div class="question-text">${q.vprašanje}</div>
            <div class="answer">${q.odgovor}</div>
            <div class="question-categories">
                ${q.kategorije.map(c => `<div class="category-tag"><i class="fas fa-tag"></i> ${c}</div>`).join('')}
            </div>`;
        card.querySelector('.favorite-btn').addEventListener('click', e => {
            toggleFavorite(q.id);
            e.currentTarget.classList.toggle('active');
            if (isFavList) displayFavorites();
            applyFilters();
        });
        return card;
    }

    function toggleFavorite(id) {
        favoriteQuestions.has(id) ? favoriteQuestions.delete(id) : favoriteQuestions.add(id);
        saveFavorites();
    }

    function setupEvents() {
        // difficulty
        document.getElementById('difficulty-filters').addEventListener('change', e => {
            const t = e.target;
            if (t.id === 'difficulty-all') {
                document.querySelectorAll('#difficulty-filters input').forEach(i => i.checked = t.checked);
                activeFilters.difficulties = t.checked ? [] : [1, 2, 3, 4, 5];
            } else {
                const d = parseInt(t.id.split('-')[1]);
                t.checked ? activeFilters.difficulties.push(d) : activeFilters.difficulties = activeFilters.difficulties.filter(v => v !== d);
                document.getElementById('difficulty-all').checked = document.querySelectorAll('#difficulty-filters input:not(#difficulty-all)').every(i => i.checked);
            }
            applyFilters();
        });

        // categories
        document.getElementById('category-filters').addEventListener('change', e => {
            const t = e.target;
            if (t.id === 'category-all') {
                document.querySelectorAll('#category-filters input').forEach(i => i.checked = t.checked);
                activeFilters.categories = t.checked ? [] : [...allCategories];
            } else {
                const cat = t.id.replace('category-', '').replace(/-/g, ' ');
                t.checked ? activeFilters.categories.push(cat) : activeFilters.categories = activeFilters.categories.filter(c => c !== cat);
                document.getElementById('category-all').checked = document.querySelectorAll('#category-filters input:not(#category-all)').every(i => i.checked);
            }
            applyFilters();
        });

        searchInput.addEventListener('input', () => {
            activeFilters.searchQuery = searchInput.value.trim().toLowerCase();
            applyFilters();
        });

        sortButtons.forEach(btn => btn.addEventListener('click', () => {
            sortButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilters.sortBy = btn.dataset.sort;
            applyFilters();
        }));

        showFavBtn.addEventListener('click', () => {
            showOnlyFavorites = !showOnlyFavorites;
            showFavBtn.innerHTML = showOnlyFavorites ?
                '<i class="fas fa-times"></i> Prikaži vsa vprašanja' :
                '<i class="fas fa-heart"></i> Prikaži priljubljene <span class="favorites-count">' + favoriteQuestions.size + '</span>';
            showFavBtn.style.background = showOnlyFavorites ? 'var(--gray)' : 'var(--favorite)';
            applyFilters();
        });

        resetBtn.addEventListener('click', () => {
            document.querySelectorAll('input[type="checkbox"]').forEach(i => i.checked = true);
            searchInput.value = '';
            activeFilters = { difficulties: [], categories: [], searchQuery: '', sortBy: 'difficulty' };
            sortButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-sort="difficulty"]').classList.add('active');
            showOnlyFavorites = false;
            showFavBtn.innerHTML = '<i class="fas fa-heart"></i> Prikaži priljubljene <span class="favorites-count">' + favoriteQuestions.size + '</span>';
            showFavBtn.style.background = 'var(--favorite)';
            applyFilters();
        });
    }
});