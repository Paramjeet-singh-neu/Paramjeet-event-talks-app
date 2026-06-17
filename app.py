import os
import time
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache for feed content
FEED_CACHE = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 600  # 10 minutes cache in seconds
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_text(text):
    """Normalize whitespace and newlines for clean tweet drafting."""
    if not text:
        return ""
    return " ".join(text.split())

def fetch_and_parse_feed(force_refresh=False):
    """Fetches the XML release notes and parses entries into discrete updates."""
    now = time.time()
    
    # Use cache if valid and refresh not forced
    if not force_refresh and FEED_CACHE["data"] and (now - FEED_CACHE["last_fetched"] < CACHE_DURATION):
        return FEED_CACHE["data"]

    try:
        # Fetch RSS feed
        headers = {
            'User-Agent': 'BigQueryReleasePulse/1.0 (Python-Requests)',
            'Accept': 'application/xml, text/xml, */*'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML root
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        releases = []
        
        for entry in root.findall('atom:entry', ns):
            # Extract date
            title_el = entry.find('atom:title', ns)
            date_str = title_el.text.strip() if title_el is not None else "Unknown Date"
            
            # Extract alternate link
            link = ""
            for l in entry.findall('atom:link', ns):
                if l.attrib.get('rel') == 'alternate':
                    link = l.attrib.get('href', '')
                    break
            if not link:
                l = entry.find('atom:link', ns)
                if l is not None:
                    link = l.attrib.get('href', '')
            
            # Extract HTML content
            content_el = entry.find('atom:content', ns)
            if content_el is None or content_el.text is None:
                continue
                
            content_html = content_el.text
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Parse individual updates by look for <h3> tag divisions
            headers = soup.find_all('h3')
            
            if not headers:
                # Fallback if there are no subheadings inside content
                text_content = clean_text(soup.get_text())
                releases.append({
                    'id': f"{date_str.replace(' ', '_').replace(',', '')}_0",
                    'date': date_str,
                    'type': 'General',
                    'html': str(soup),
                    'text': text_content,
                    'link': link
                })
            else:
                for idx, h3 in enumerate(headers):
                    update_type = h3.text.strip()
                    
                    # Accumulate child elements until the next <h3>
                    sibling_html = []
                    sibling_text_list = []
                    sibling = h3.next_sibling
                    
                    while sibling and sibling.name != 'h3':
                        if sibling.name:
                            sibling_html.append(str(sibling))
                            sibling_text_list.append(sibling.get_text().strip())
                        elif isinstance(sibling, str) and sibling.strip():
                            sibling_html.append(sibling.strip())
                            sibling_text_list.append(sibling.strip())
                        sibling = sibling.next_sibling
                    
                    html_str = "".join(sibling_html).strip()
                    text_str = clean_text(" ".join([t for t in sibling_text_list if t]))
                    
                    item_id = f"{date_str.replace(' ', '_').replace(',', '')}_{idx}"
                    
                    if not html_str:
                        # Skip empty elements
                        continue
                        
                    releases.append({
                        'id': item_id,
                        'date': date_str,
                        'type': update_type,
                        'html': html_str,
                        'text': text_str,
                        'link': link
                    })
        
        FEED_CACHE["data"] = releases
        FEED_CACHE["last_fetched"] = now
        return releases
    except Exception as e:
        # Fallback to cached data if possible during an error
        if FEED_CACHE["data"]:
            return FEED_CACHE["data"]
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'releases': releases,
            'cached_at': FEED_CACHE["last_fetched"]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
