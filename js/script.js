const mapRoot = document.querySelector("#neighborhood-map");
const infoPanel = document.querySelector("#info-panel");
const welcomeView = document.querySelector("#welcome-view");
const profileView = document.querySelector("#profile-view");
const profileName = document.querySelector("#profile-name");
const profileStatus = document.querySelector("#profile-status");
const profileImage = document.querySelector("#profile-image");
const profileImageFallback = document.querySelector("#profile-image-fallback");
const profileBody = document.querySelector("#profile-body");

const neighborhoodDataUrl = "data/sf-neighborhoods.geojson";
const neighborhoodProfilesUrl = "data/neighborhoods.json";

const PROFILE_SECTIONS = [
  {
    key: "buildingsArchitecture",
    title: "Buildings & Architecture",
  },
  {
    key: "landmarks",
    title: "Landmarks",
  },
  {
    key: "rescueConsiderations",
    title: "Rescue Considerations",
  },
];

let neighborhoods = null;
let neighborhoodProfiles = new Map();
let selectedNeighborhood = null;
let hoveredNeighborhood = null;
let renderFrame = 0;
let lastSize = { width: 0, height: 0 };

const tooltip = document.createElement("div");
tooltip.className = "map-tooltip";
tooltip.hidden = true;
document.body.appendChild(tooltip);

function getNeighborhoodName(feature) {
  return feature.properties.nhood;
}

function showTooltip(name, event) {
  tooltip.textContent = name;
  tooltip.hidden = false;
  moveTooltip(event);
}

function moveTooltip(event) {
  const offset = 12;
  const { width, height } = tooltip.getBoundingClientRect();
  const maxLeft = window.innerWidth - width - 8;
  const maxTop = window.innerHeight - height - 8;
  const left = Math.min(event.clientX + offset, maxLeft);
  const top = Math.min(event.clientY + offset, maxTop);

  tooltip.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
}

function hideTooltip() {
  tooltip.hidden = true;
  tooltip.textContent = "";
}

function indexNeighborhoodProfiles(data) {
  const profiles = new Map();

  for (const profile of data.neighborhoods || []) {
    if (!profile.geoName) {
      continue;
    }

    profiles.set(profile.geoName, profile);
  }

  return profiles;
}

function setProfileImage(profile) {
  const imageSrc = profile?.image?.src?.trim();
  const imageAlt = profile?.image?.alt || profile?.geoName || "Neighborhood image";

  profileImage.onload = null;
  profileImage.onerror = null;
  profileImage.removeAttribute("src");
  profileImage.alt = "";
  profileImage.hidden = true;
  profileImageFallback.hidden = false;
  profileImageFallback.setAttribute("aria-label", "Image placeholder");

  if (!imageSrc) {
    return;
  }

  profileImage.onload = () => {
    profileImage.hidden = false;
    profileImageFallback.hidden = true;
  };

  profileImage.onerror = () => {
    profileImage.hidden = true;
    profileImage.removeAttribute("src");
    profileImage.alt = "";
    profileImageFallback.hidden = false;
  };

  profileImage.alt = imageAlt;
  profileImage.src = imageSrc;
}

function getValidSources(profile) {
  return (profile.sources || []).filter(
    (source) => source?.label?.trim() && source?.url?.trim()
  );
}

function renderProfileSections(profile) {
  profileBody.replaceChildren();

  for (const section of PROFILE_SECTIONS) {
    const text = profile.sections?.[section.key]?.trim();

    if (!text) {
      continue;
    }

    const sectionEl = document.createElement("section");
    sectionEl.className = "profile-section";

    const heading = document.createElement("h3");
    heading.textContent = section.title;

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    sectionEl.append(heading, paragraph);
    profileBody.append(sectionEl);
  }

  const sources = getValidSources(profile);

  if (sources.length === 0) {
    return;
  }

  const sourcesSection = document.createElement("section");
  sourcesSection.className = "profile-section";

  const heading = document.createElement("h3");
  heading.textContent = "Sources";

  const list = document.createElement("ul");
  list.className = "profile-sources";

  for (const source of sources) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url.trim();
    link.textContent = source.label.trim();
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.append(link);
    list.append(item);
  }

  sourcesSection.append(heading, list);
  profileBody.append(sourcesSection);
}

function showWelcomePanel() {
  welcomeView.hidden = false;
  profileView.hidden = true;
  profileBody.replaceChildren();
  profileStatus.hidden = true;
  profileStatus.textContent = "";
  setProfileImage(null);
  infoPanel.dataset.mode = "welcome";
}

function showComingSoonPanel(geoName) {
  welcomeView.hidden = true;
  profileView.hidden = false;
  profileName.textContent = geoName;
  profileStatus.hidden = true;
  profileStatus.textContent = "";
  setProfileImage(null);

  profileBody.replaceChildren();
  const message = document.createElement("p");
  message.textContent = "Information coming soon.";
  profileBody.append(message);

  infoPanel.dataset.mode = "coming-soon";
}

function showNeighborhoodProfile(profile) {
  welcomeView.hidden = true;
  profileView.hidden = false;
  profileName.textContent = profile.geoName;

  profileStatus.hidden = true;
  profileStatus.textContent = "";

  setProfileImage(profile);
  renderProfileSections(profile);
  infoPanel.dataset.mode = "profile";
}

function updateInfoPanel(geoName) {
  if (!geoName) {
    showWelcomePanel();
    return;
  }

  const profile = neighborhoodProfiles.get(geoName);

  if (!profile) {
    showComingSoonPanel(geoName);
    return;
  }

  showNeighborhoodProfile(profile);
}

function syncNeighborhoodAppearance() {
  d3.select(mapRoot)
    .selectAll("path.neighborhood")
    .classed("is-selected", (d) => getNeighborhoodName(d) === selectedNeighborhood)
    .classed("is-hovered", (d) => getNeighborhoodName(d) === hoveredNeighborhood)
    .attr("aria-pressed", (d) =>
      getNeighborhoodName(d) === selectedNeighborhood ? "true" : "false"
    );
}

function setHoveredNeighborhood(name) {
  if (hoveredNeighborhood === name) {
    return;
  }

  hoveredNeighborhood = name;
  syncNeighborhoodAppearance();
}

function selectNeighborhood(name) {
  if (selectedNeighborhood === name) {
    syncNeighborhoodAppearance();
    return;
  }

  selectedNeighborhood = name;
  syncNeighborhoodAppearance();
  updateInfoPanel(name);
}

function drawNeighborhoods(width, height) {
  const svg = d3
    .select(mapRoot)
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "group")
    .attr("aria-label", "Map of San Francisco neighborhood boundaries");

  const projection = d3.geoMercator().fitExtent(
    [
      [12, 12],
      [width - 12, height - 12],
    ],
    neighborhoods
  );

  const path = d3.geoPath(projection);

  svg
    .selectAll("path.neighborhood")
    .data(neighborhoods.features, getNeighborhoodName)
    .join((enter) =>
      enter
        .append("path")
        .attr("class", "neighborhood")
        .attr("tabindex", 0)
        .attr("role", "button")
    )
    .attr("d", path)
    .attr("aria-label", (d) => getNeighborhoodName(d))
    .on("pointerenter", (event, d) => {
      if (event.pointerType === "touch") {
        return;
      }

      const name = getNeighborhoodName(d);
      setHoveredNeighborhood(name);
      showTooltip(name, event);
    })
    .on("pointermove", (event) => {
      if (event.pointerType === "touch" || tooltip.hidden) {
        return;
      }

      moveTooltip(event);
    })
    .on("pointerleave", (event, d) => {
      if (hoveredNeighborhood === getNeighborhoodName(d)) {
        setHoveredNeighborhood(null);
      }

      hideTooltip();
    })
    .on("pointerdown", (event, d) => {
      if (event.button !== 0) {
        return;
      }

      // Select on pointerdown so a later DOM/focus change cannot cancel the gesture.
      event.preventDefault();
      selectNeighborhood(getNeighborhoodName(d));
    })
    .on("click", (event, d) => {
      event.preventDefault();
      selectNeighborhood(getNeighborhoodName(d));
    })
    .on("keydown", (event, d) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      selectNeighborhood(getNeighborhoodName(d));
    });

  syncNeighborhoodAppearance();
}

function renderMap() {
  if (!neighborhoods) {
    return;
  }

  const { width, height } = mapRoot.getBoundingClientRect();
  const pixelWidth = Math.round(width);
  const pixelHeight = Math.round(height);

  if (pixelWidth < 2 || pixelHeight < 2) {
    return;
  }

  if (pixelWidth === lastSize.width && pixelHeight === lastSize.height) {
    return;
  }

  lastSize = { width: pixelWidth, height: pixelHeight };
  drawNeighborhoods(pixelWidth, pixelHeight);
}

showWelcomePanel();

Promise.all([d3.json(neighborhoodDataUrl), d3.json(neighborhoodProfilesUrl)])
  .then(([boundaryData, profileData]) => {
    neighborhoods = boundaryData;
    neighborhoodProfiles = indexNeighborhoodProfiles(profileData);
    renderMap();
  })
  .catch((error) => {
    console.error("Unable to load neighborhood map data.", error);
  });

new ResizeObserver(() => {
  cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(renderMap);
}).observe(mapRoot);

const creditButton = document.querySelector("#credit-button");

if (creditButton) {
  creditButton.addEventListener("click", () => {
    const isOpen = creditButton.classList.toggle("is-open");
    creditButton.setAttribute("aria-expanded", String(isOpen));
  });
}
