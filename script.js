// INITIAL VARIABLE DEFINITIONS
const apiBase = "https://en.wikipedia.org/w/api.php"; // Wikipedia API base URL
const graphData = {nodes: [], links: []};           // Graph data object
const nodeMap = new Map();                            // Map to store nodes by title          

// DOM ELEMENTS AND EVENT LISTENERS
// Get DOM elements
const searchInput = document.getElementById("search-input");   // Search input element

// Add event listeners for search input and button
searchInput.addEventListener("input", () => {
    // Fetch search suggestions when user types in the search input

    const query = searchInput.value.trim();

    if (query) {
        fetchAndDisplaySuggestions(query);
    }
});

// FUNCTION DEFINITIONS
// Fetch search suggestions from Wikipedia API
const fetchAndDisplaySuggestions = (query) => {
    // Construct URL for search suggestions
    const url = `${apiBase}?action=opensearch&search=${query}&limit=5&format=json&origin=*`;

    // Fetch search suggestions from Wikipedia API
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const suggestions = data[1];
            displaySuggestions(suggestions);
        })
        .catch(error => console.error("Error fetching suggestions:", error));

    // SUBROUTINES
    // Display search suggestions in the suggestions list
    const displaySuggestions = (suggestions) => {
        const suggestionsList = document.getElementById("suggestions");
        suggestionsList.innerHTML = ""; // Clear previous suggestions

        // Create suggestion list from search suggestion component
        suggestions.forEach(title => {
            const li = document.createElement("li");
            li.classList.add('search-suggestion-component');
            li.textContent = title;

            li.addEventListener("click", () => {
                document.getElementById("search-input").value = title;
                fetchArticles(title);
                suggestionsList.innerHTML = ""; // Clear suggestions
            });

            suggestionsList.appendChild(li);
        });
    }
};

// Fetch articles and related links from Wikipedia API
const fetchArticles = (query) => {
    // Clear previous graph data
    clearGraph();

    // Construct URL for article search
    const searchUrl = `${apiBase}?action=opensearch&search=${query}&limit=1&format=json&origin=*`;

    // Fetch articles from Wikipedia API
    fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            const article = data[1][0]; // First result title
            if (article) fetchLinks(article);
            else alert("No articles found!");
        })
        .catch(error => console.error("Error fetching articles:", error));

    // SUBROUTINES
    // Fetch related links for an article
    const fetchLinks = (article) => {
        const linksUrl = `${apiBase}?action=query&prop=links&titles=${encodeURIComponent(article)}&format=json&pllimit=10&origin=*`;

        fetch(linksUrl)
            .then(response => response.json())
            .then(data => {
                const pageId = Object.keys(data.query.pages)[0];
                const links = data.query.pages[pageId].links.map(link => link.title);
                addNodeToGraphAndVisualize(article, links);
            })
            .catch(error => console.error("Error fetching links:", error));
    }
}

// Add a node to the graph and visualize it
const addNodeToGraphAndVisualize = (centerTopic, relatedTopics) => {
    // Visualize the graph using D3.js
    const visualizeGraph = () => {
        // Add drag behavior to the nodes
        const drag = (simulation) => {
            const dragstarted = (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            const dragged = (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            }
            const dragended = (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        // Get DOM element for the graph container
        const container = document.getElementById("graph-container");

        // Get width and height of the graph container
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create SVG element for the graph
        const svg = d3.select("#graph-container").html("").append("svg")
            .attr("width", width)
            .attr("height", height);

        // Create D3 force simulation
        const simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Create links, nodes, and text elements
        const link = svg.append("g")
            .selectAll("line")
            .data(graphData.links)
            .enter().append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "#aaa");

        // Add nodes to the graph
        const node = svg.append("g")
            .selectAll("circle")
            .data(graphData.nodes)
            .enter().append("circle")
            .attr("r", 10)
            .attr("fill", d => d.group === 1 ? "#ff5722" : "#4caf50")
            .on("click", (_, d) => {
                window.open(d.url, "_blank"); // Open Wikipedia link in a new tab
                fetchLinks(d.id); // Fetch related links for clicked node
                fetchArticles(d.id);
            })
            .call(drag(simulation));

        // Add text labels to the nodes
        const text = svg.append("g")
            .selectAll("text")
            .data(graphData.nodes)
            .enter().append("text")
            .attr("dx", 15)
            .attr("dy", 4)
            .text(d => d.id);

        // Update node and link positions on each tick
        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);

            text.attr("x", d => d.x)
                .attr("y", d => d.y);
        });
    }

    // Add center topic if not already in the graph
    if (!nodeMap.has(centerTopic)) {
        graphData.nodes.push({
            id: centerTopic,
            group: 1,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(centerTopic)}`
        });

        nodeMap.set(centerTopic, true);
    }

    // Add related topics and links to the graph
    relatedTopics.forEach(topic => {
        if (!nodeMap.has(topic)) {
            graphData.nodes.push({
                id: topic,
                group: 2,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`
            });

            nodeMap.set(topic, true);
        }
        graphData.links.push({source: centerTopic, target: topic});
    });

    // Visualize the graph
    visualizeGraph();

    // SUBROUTINES
    // Add search history to the search history list
    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${centerTopic}</td>
    <td>${relatedTopics.map(el => JSON.stringify(el)).join(", ")}</td>
    <td>${(new Date()).toISOString()}</td>
  `;

    document.querySelector(".search-history--body").appendChild(row);
}

const clearGraph = () => {
    graphData.nodes = [];
    graphData.links = [];
    nodeMap.clear();
    document.getElementById("graph-container").innerHTML = "";
}

// Icon background
const container = document.getElementById("icon-container");
const iconList = [
    "fas fa-heart",
    "fas fa-star",
    "fas fa-moon",
    "fas fa-cloud",
    "fas fa-bolt",
    "fas fa-leaf",
    "fas fa-bell",
    "fas fa-smile",
    "fas fa-sun"
];

const getRandom = (min, max) => {
    return Math.random() * (max - min) + min;
}

const createIcon = () => {
    const icon = document.createElement("i");
    icon.className = `icon ${iconList[Math.floor(Math.random() * iconList.length)]}`;
    icon.style.left = `${getRandom(0, 100)}vw`;
    icon.style.top = `${getRandom(0, 100)}vh`;
    icon.style.setProperty("--x-dir", getRandom(-1, 1));
    icon.style.setProperty("--y-dir", getRandom(-1, 1));
    icon.style.fontSize = `${getRandom(1, 3)}rem`;
    icon.style.color = `hsl(${Math.random() * 360}, 70%, 70%)`;

    container.appendChild(icon);

    setTimeout(() => {
        container.removeChild(icon);
    }, 5000);
}

setInterval(createIcon, 300);