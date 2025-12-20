const express = require('express');
const cors = require('cors');
const { load } = require('cheerio');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 perc

const RequestBodySchema = {
    year: (val) => /^\d{4}-\d{4}-\d$/.test(val),
    name: (val) => typeof val === 'string' ? val.length > 0 : Array.isArray(val) && val.length > 0 && val.length <= 100
};

async function fetchSearchData(searchMode, searchName, year) {
    const baseUrl = 'https://tanrend.elte.hu/tanrendnavigation.php';
    const qs = new URLSearchParams({ m: searchMode, f: year, k: searchName });
    const cacheKey = `${searchMode}:${searchName}:${year}`;
    
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const resp = await fetch(`${baseUrl}?${qs}`, { 
            signal: controller.signal, 
            redirect: 'manual' 
        });
        clearTimeout(timeoutId);
        
        if (!resp.ok) return [];
        
        const html = await resp.text();
        const $ = load(html);
        const data = [];
        
        $('tbody tr').each((_, tr) => {
            const row = [];
            $(tr).find('td').each((__, td) => row.push($(td).text().trim()));
            if (row.length) data.push(row);
        });
        
        CACHE.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (e) {
        clearTimeout(timeoutId);
        return [];
    }
}

function getSearchMode(name) {
    return Array.isArray(name) ? ['keres_kod_azon'] : ['keres_kod_azon'];
}

app.post('/api', async (req, res) => {
    try {
        const { year, name } = req.body;
        
        if (!RequestBodySchema.year(year) || !RequestBodySchema.name(name)) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        
        const isListSearch = Array.isArray(name);
        const names = isListSearch ? name : [name];
        const data = [];
        const searchModes = isListSearch ? ['keres_kod_azon'] : getSearchMode(name);
        
        for (const searchMode of searchModes) {
            const nameTasks = names.map((searchName) =>
                fetchSearchData(searchMode, searchName, year)
            );
            
            const nameResults = await Promise.allSettled(nameTasks);
            
            let foundData = false;
            for (const result of nameResults) {
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    data.push(...result.value);
                    foundData = true;
                }
            }
            
            if (foundData) break;
        }
        
        res.json(data);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'ELTE Órarend API JS 🚀' }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

module.exports = app;
