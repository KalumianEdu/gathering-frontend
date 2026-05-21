import re

with open('src/adminMain.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

with open('src/userManagement.html', 'r', encoding='utf-8') as f:
    user_html = f.read()

def extract_content(html, tag, include_tag=True):
    start = html.find(f'<{tag}')
    end_tag = f'</{tag}>'
    end = html.find(end_tag) + len(end_tag)
    if not include_tag:
        start = html.find('>', start) + 1
        end = html.find(end_tag)
    return html[start:end]

# User management sections
user_main = extract_content(user_html, 'main', include_tag=False)

# Removing footer from user_main as we will use a common footer
user_main_no_footer = re.sub(r'<footer.*?</footer>', '', user_main, flags=re.DOTALL)

# In admin_html we want to replace the main content with the tabs structure.
# But admin_html already has the footer we want to keep.
admin_main_start = admin_html.find('<main')
admin_main_start_tag_end = admin_html.find('>', admin_main_start) + 1
admin_main_end = admin_html.find('</main>')

admin_main_content = admin_html[admin_main_start_tag_end:admin_main_end]

# Extract footer from admin_main
admin_footer = extract_content(admin_main_content, 'footer')
admin_main_no_footer = admin_main_content.replace(admin_footer, '')

script = """
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const tabOverview = document.getElementById('tab-overview');
    const tabUsers = document.getElementById('tab-users');
    const viewOverview = document.getElementById('view-overview');
    const viewUsers = document.getElementById('view-users');

    const activeTabClass = ['bg-[#4a7c59]', 'text-white', 'shadow-sm', 'font-semibold'];
    const inactiveTabClass = ['text-stone-600', 'hover:bg-stone-100', 'hover:translate-x-1', 'dark:text-stone-400', 'dark:hover:bg-stone-800'];

    function switchTab(activeId) {
      if (activeId === 'overview') {
        viewOverview.style.display = 'block';
        viewUsers.style.display = 'none';

        tabOverview.classList.add(...activeTabClass);
        tabOverview.classList.remove(...inactiveTabClass);
        tabUsers.classList.add(...inactiveTabClass);
        tabUsers.classList.remove(...activeTabClass);
      } else if (activeId === 'users') {
        viewOverview.style.display = 'none';
        viewUsers.style.display = 'flex';

        tabUsers.classList.add(...activeTabClass);
        tabUsers.classList.remove(...inactiveTabClass);
        tabOverview.classList.add(...inactiveTabClass);
        tabOverview.classList.remove(...activeTabClass);
      }
    }

    tabOverview.addEventListener('click', (e) => { e.preventDefault(); switchTab('overview'); });
    tabUsers.addEventListener('click', (e) => { e.preventDefault(); switchTab('users'); });
  });
</script>
"""

new_main_content = f"""
  <div id="view-overview" style="display: block;">
    {admin_main_no_footer}
  </div>
  <div id="view-users" style="display: none; flex-direction: column; width: 100%;">
    {user_main_no_footer}
  </div>
  {admin_footer}
  {script}
"""

new_admin_html = admin_html[:admin_main_start_tag_end] + new_main_content + admin_html[admin_main_end:]

# We also need to update the sidebar to add IDs and change hrefs
new_admin_html = new_admin_html.replace('href="adminMain.html"', 'href="#" id="tab-overview"')
# The active Overview tab original code in adminMain: 
nav_overview = '<a class="bg-[#4a7c59] text-white rounded-xl shadow-sm flex items-center gap-3 px-4 py-3 transition-transform hover:translate-x-1"'
if nav_overview in new_admin_html:
    new_admin_html = new_admin_html.replace(nav_overview, nav_overview + ' id="tab-overview" href="#"')

# The user management tab in adminMain:
nav_users_orig = '<a class="text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl flex items-center gap-3 px-4 py-3 transition-transform hover:translate-x-1" href="userManagement.html">'
if nav_users_orig in new_admin_html:
    new_admin_html = new_admin_html.replace(nav_users_orig, '<a class="text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl flex items-center gap-3 px-4 py-3 transition-transform hover:translate-x-1" href="#" id="tab-users">')

with open('src/adminMain.html', 'w', encoding='utf-8') as f:
    f.write(new_admin_html)

