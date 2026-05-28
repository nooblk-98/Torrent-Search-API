let allResults = [];
let currentSort = { key: 'seeders', dir: 'desc' };
let currentPage = 1;
let suggestTimer = null;
let suggestionIndex = -1;

function copyMagnet(btn, magnet) {
    navigator.clipboard.writeText(magnet).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.backgroundColor = '#28a745';
        setTimeout(() => {
            btn.textContent = orig;
            btn.style.backgroundColor = '';
        }, 2000);
    });
}

// Wire up search button
$(document).ready(function() {
    $('#search-btn').on('click', function() { searchTorrents(); });
});

// Load providers
$(async function () {
    const $select = $('#website');
    $select.empty().append('<option value="" disabled selected>Loading providers...</option>');

    try {
        const resp = await fetch('/api/torrents?_=' + Date.now());
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
        const providers = await resp.json();

        if (!Array.isArray(providers) || providers.length === 0) {
            throw new Error('No providers returned');
        }

        $select.empty();
        $select.append('<option value="all">All Sites</option>');
        providers.forEach(function(p) {
            $select.append('<option value="' + p + '">' + p + '</option>');
        });
        console.log('Loaded ' + providers.length + ' providers:', providers);
    } catch (err) {
        console.error('Failed to load providers:', err);
        $select.empty().append('<option value="">Error: ' + err.message + '</option>');
    }
});

// Search suggestions (debounced)
$('#query').on('input', function () {
    const q = $(this).val().trim();
    clearTimeout(suggestTimer);
    suggestionIndex = -1;
    if (q.length < 2) { hideSuggestions(); return; }
    suggestTimer = setTimeout(function() { fetchSuggestions(q); }, 280);
});

async function fetchSuggestions(q) {
    try {
        const resp = await fetch('/api/suggest?q=' + encodeURIComponent(q));
        const suggestions = await resp.json();
        renderSuggestions(suggestions);
    } catch (e) {
        hideSuggestions();
    }
}

function renderSuggestions(items) {
    const $list = $('#suggestions').empty();
    if (!items.length) { hideSuggestions(); return; }
    items.forEach(function(text) {
        $('<li>').text(text).on('mousedown', function () {
            $('#query').val($(this).text());
            hideSuggestions();
            searchTorrents();
        }).appendTo($list);
    });
    $list.show();
}

function hideSuggestions() {
    $('#suggestions').hide().empty();
    suggestionIndex = -1;
}

// Keyboard navigation for suggestions
$('#query').on('keydown', function (e) {
    const $items = $('#suggestions li');
    if (!$items.length) {
        if (e.key === 'Enter') searchTorrents();
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        suggestionIndex = Math.min(suggestionIndex + 1, $items.length - 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        suggestionIndex = Math.max(suggestionIndex - 1, -1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestionIndex >= 0) {
            $('#query').val($items.eq(suggestionIndex).text());
            hideSuggestions();
            searchTorrents();
        } else {
            hideSuggestions();
            searchTorrents();
        }
        return;
    } else if (e.key === 'Escape') {
        hideSuggestions(); return;
    } else { return; }
    $items.removeClass('active').eq(suggestionIndex).addClass('active');
    if (suggestionIndex >= 0) $('#query').val($items.eq(suggestionIndex).text());
});

// Hide suggestions when clicking outside
$(document).on('mousedown', function (e) {
    if (!$(e.target).closest('.search-wrapper').length) hideSuggestions();
});

// Search
function searchTorrents(page) {
    if (page === undefined) page = 1;
    const query = $('#query').val().trim();
    const website = $('#website').val();
    if (!website || !query) return;

    currentPage = page;
    hideSuggestions();
    $('#spinner-container').show();
    $('#results').empty();
    $('#pagination').empty();
    $('#sort-bar').removeClass('visible');
    $('#results-info').hide();

    const apiUrl = '/api/' + encodeURIComponent(website) + '/' + encodeURIComponent(query) + '/' + page;

    fetch(apiUrl)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data || data.length === 0) {
                $('#results').html('<div class="text-center col-12">No results found.</div>');
                return;
            }
            allResults = data.filter(function(t) { return t.Name && t.Name.trim() !== ''; });
            if (!allResults.length) {
                $('#results').html('<div class="text-center col-12">No results found.</div>');
                return;
            }
            renderResults();
            renderPagination();
            $('#sort-bar').addClass('visible');
        })
        .catch(function() {
            $('#results').html('<div class="text-center text-danger col-12">Failed to load results.</div>');
        })
        .finally(function() {
            $('#spinner-container').hide();
        });
}

function renderPagination() {
    const $p = $('#pagination').empty();
    const prev = $('<button>&#8592; Prev</button>').prop('disabled', currentPage <= 1)
        .on('click', function() { searchTorrents(currentPage - 1); window.scrollTo(0, 0); });
    const curr = $('<button>').text('Page ' + currentPage).addClass('current').prop('disabled', true);
    const next = $('<button>Next &#8594;</button>')
        .on('click', function() { searchTorrents(currentPage + 1); window.scrollTo(0, 0); });
    $p.append(prev, curr, next);
}

// Sorting
$('#sort-bar').on('click', '.sort-btn', function () {
    const key = $(this).data('sort');
    if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
    } else {
        currentSort = { key: key, dir: key === 'name' ? 'asc' : 'desc' };
    }
    $('#sort-bar .sort-btn').removeClass('active').find('.arrow').text('▼');
    $(this).addClass('active').find('.arrow').text(currentSort.dir === 'desc' ? '▼' : '▲');
    renderResults();
});

function parseSize(str) {
    if (!str) return 0;
    const s = str.replace(/,/g, '').replace(/&nbsp;/g, ' ').trim();
    const m = s.match(/([\d.]+)\s*(TB|GB|MB|KB|B)/i);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const u = m[2].toUpperCase();
    const units = { TB: 1e12, GB: 1e9, MB: 1e6, KB: 1e3, B: 1 };
    return n * (units[u] || 1);
}

function renderResults() {
    const sorted = [].concat(allResults).sort(function(a, b) {
        var va, vb;
        if (currentSort.key === 'seeders') {
            va = parseInt(a.Seeders) || 0; vb = parseInt(b.Seeders) || 0;
        } else if (currentSort.key === 'leechers') {
            va = parseInt(a.Leechers) || 0; vb = parseInt(b.Leechers) || 0;
        } else if (currentSort.key === 'size') {
            va = parseSize(a.Size); vb = parseSize(b.Size);
        } else {
            va = (a.Name || '').toLowerCase(); vb = (b.Name || '').toLowerCase();
            return currentSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return currentSort.dir === 'desc' ? vb - va : va - vb;
    });

    const $results = $('#results').empty();
    const $info = $('#results-info');
    $info.text(sorted.length + ' result' + (sorted.length !== 1 ? 's' : '')).show();

    sorted.forEach(function(torrent) {
        const magnet = torrent.Magnet || torrent.MagnetLink || '';
        const poster = torrent.Poster ? '<img src="' + torrent.Poster + '" alt="' + (torrent.Name || '') + '">' : '';
        const magnetBtn = magnet ? '<button class="btn-custom" onclick="copyMagnet(this, \'' + magnet.replace(/'/g, "\\'") + '\')">Copy Magnet</button>' : '';
        const viewBtn = torrent.Url ? '<a href="' + torrent.Url + '" class="btn-custom" target="_blank">View</a>' : '';
        $results.append(
            '<div class="movie-card">' +
                poster +
                '<div class="movie-details">' +
                    '<h5 title="' + (torrent.Name || '') + '">' + (torrent.Name || 'N/A') + '</h5>' +
                    '<p><strong>Size:</strong> ' + (torrent.Size || 'N/A') + '</p>' +
                    '<p><strong>Seeds:</strong> ' + (torrent.Seeders || 'N/A') + ' &nbsp;|&nbsp; <strong>Leech:</strong> ' + (torrent.Leechers || 'N/A') + '</p>' +
                    '<div class="button-container">' + magnetBtn + viewBtn + '</div>' +
                '</div>' +
            '</div>'
        );
    });
}
