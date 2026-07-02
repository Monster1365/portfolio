const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const githubUsername = "Monster1365";
const makeWebhookUrl = "https://hook.us2.make.com/smmthulbl3ctxgjs5d1xtfojy7v757e1";

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

document.addEventListener("click", (event) => {
  const clickedInsideMenu = navLinks.contains(event.target);
  const clickedMenuButton = menuBtn.contains(event.target);

  if (!clickedInsideMenu && !clickedMenuButton) {
    navLinks.classList.remove("show");
  }
});

const formatNumber = (value) => new Intl.NumberFormat("en").format(value);

const safeText = (value, fallback = "") => {
  if (!value) {
    return fallback;
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const getTotalFromLinkHeader = (linkHeader) => {
  if (!linkHeader) {
    return null;
  }

  const lastLink = linkHeader
    .split(",")
    .find((part) => part.includes('rel="last"'));

  if (!lastLink) {
    return null;
  }

  const match = lastLink.match(/[?&]page=(\d+)/);
  return match ? Number(match[1]) : null;
};

const getRepoCommitCount = async (repoName) => {
  const response = await fetch(
    `https://api.github.com/repos/${githubUsername}/${repoName}/commits?author=${githubUsername}&per_page=1`
  );

  if (!response.ok) {
    return 0;
  }

  const totalFromHeader = getTotalFromLinkHeader(response.headers.get("Link"));
  if (totalFromHeader !== null) {
    return totalFromHeader;
  }

  const commits = await response.json();
  return commits.length;
};

const updateCommitMeter = (totalCommits) => {
  const meter = document.getElementById("commitMeter");
  if (!meter) {
    return;
  }

  const width = Math.min(100, Math.max(12, totalCommits * 4));
  meter.style.width = `${width}%`;
};

const renderRepos = (repos) => {
  const repoList = document.getElementById("repoList");
  if (!repoList) {
    return;
  }

  const visibleRepos = repos.slice(0, 6);
  repoList.innerHTML = visibleRepos
    .map((repo) => {
      const description = safeText(repo.description, "No description yet.");
      const language = safeText(repo.language, "Code");
      const updatedAt = new Date(repo.updated_at).toLocaleDateString("en", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return `
        <article class="activity-card">
          <header>
            <span class="tag">${language}</span>
            <span class="repo-meta">Updated ${updatedAt}</span>
          </header>
          <h2>
            <a href="${repo.html_url}" target="_blank" rel="noreferrer">
              ${safeText(repo.name)}
            </a>
          </h2>
          <p>${description}</p>
          <div class="repo-meta">
            <span>Stars ${repo.stargazers_count}</span>
            <span>Forks ${repo.forks_count}</span>
          </div>
        </article>
      `;
    })
    .join("");
};

const loadGitHubActivity = async () => {
  const repoCount = document.getElementById("repoCount");
  const followerCount = document.getElementById("followerCount");
  const commitCount = document.getElementById("commitCount");

  try {
    const [profileResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${githubUsername}`),
      fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=100`),
    ]);

    if (!profileResponse.ok || !reposResponse.ok) {
      throw new Error("GitHub API request failed.");
    }

    const profile = await profileResponse.json();
    const repos = await reposResponse.json();
    const publicRepos = repos.filter((repo) => !repo.fork);

    if (repoCount) {
      repoCount.textContent = formatNumber(profile.public_repos);
    }

    if (followerCount) {
      followerCount.textContent = formatNumber(profile.followers);
    }

    renderRepos(publicRepos);

    const commitCounts = await Promise.all(
      publicRepos.slice(0, 12).map((repo) => getRepoCommitCount(repo.name))
    );
    const totalCommits = commitCounts.reduce((sum, count) => sum + count, 0);

    if (commitCount) {
      commitCount.textContent = formatNumber(totalCommits);
    }
    updateCommitMeter(totalCommits);
  } catch (error) {
    if (repoCount) {
      repoCount.textContent = "GitHub";
    }

    if (followerCount) {
      followerCount.textContent = "Public";
    }

    if (commitCount) {
      commitCount.textContent = "Live";
    }

    updateCommitMeter(10);
  }
};

loadGitHubActivity();

const contactForm = document.getElementById("contactForm");
const responseMessage = document.getElementById("responseMessage");

const setFormMessage = (type, message) => {
  if (!responseMessage) {
    return;
  }

  responseMessage.className = `form-message ${type}`;
  responseMessage.textContent = message;
};

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("visitorName").value.trim();
    const email = document.getElementById("visitorEmail").value.trim();
    const message = document.getElementById("visitorMessage").value.trim();
    const formPayload = {
      event_type: "ai_question_submitted",
      visitor_name: name,
      visitor_email: email,
      visitor_message: message,
      submitted_at: new Date().toISOString(),
      page_url: window.location.href,
      user_agent: window.navigator.userAgent,
    };

    setFormMessage("info", "AI 에이전트가 질문을 분석 중입니다. 잠시만 기다려주세요.");

    try {
      const response = await fetch(makeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formPayload),
      });

      if (!response.ok) {
        throw new Error("서버 응답 실패");
      }

      setFormMessage("success", "질문이 성공적으로 접수되었습니다. AI 답변 메일이 곧 도착할 예정입니다.");
      contactForm.reset();
    } catch (error) {
      setFormMessage("error", "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  });
}
