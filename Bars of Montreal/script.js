const actorRunsUrl = "https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=apify_api_PZji7Z8F7bWw1AEQY1o3JEYfvYDxFB456Iic";
const currentEasternHour = new Date().getHours() - 5; // Convert UTC to EST (-5 hours)
const itemsPerPage = 10; // Number of items to display per page
let currentPage = 1; // Current page number
let datasetItems = []; // Store all dataset items

// Function to display items for the current page
function displayItems(page) {
    const mainContainer = document.querySelector(".main");
    mainContainer.innerHTML = ""; // Clear existing content

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToDisplay = datasetItems.slice(startIndex, endIndex);

    itemsToDisplay.forEach((bar, index) => {
        const barElement = document.createElement("div");
        barElement.className = `bar${index + 1}`;

        // Get popularity data for the current hour
        let averagePopularity = "Not Available";
        let livePopularity = "Not Available";
        let differenceText = "";

        if (bar.popularTimesHistogram) {
            const currentDay = new Date().toLocaleString("en-US", { weekday: "short" });
            const capitalizedDay = currentDay.substring(0, 2);
            const dayData = bar.popularTimesHistogram[capitalizedDay];
            if (dayData) {
                const hourData = dayData.find((item) => item.hour === currentEasternHour);
                if (hourData) {
                    averagePopularity = `${hourData.occupancyPercent}%`;

                    // Check if live popularity data is available
                    if (bar.popularTimesLivePercent !== undefined) {
                        livePopularity = `${bar.popularTimesLivePercent}%`;

                        // Calculate the difference between live and average occupancy
                        const difference = bar.popularTimesLivePercent - hourData.occupancyPercent;
                        differenceText = `(${difference >= 0 ? "+" : ""}${difference}%)`;
                    }
                }
            }
        }

        // Calculate average review score
        let averageReviewScore = "N/A";
        if (bar.reviewsDistribution) {
            const { fiveStar, fourStar, threeStar, twoStar, oneStar } = bar.reviewsDistribution;
            const totalReviews = fiveStar + fourStar + threeStar + twoStar + oneStar;
            if (totalReviews > 0) {
                const weightedScore = (5 * fiveStar) + (4 * fourStar) + (3 * threeStar) + (2 * twoStar) + (1 * oneStar);
                averageReviewScore = (weightedScore / totalReviews).toFixed(1); // Round to 1 decimal place
            }
        }

        barElement.innerHTML = `
            <div class="bar-info">
                <h2 id="bar-title-${index + 1}">${bar.title || "Unnamed Bar"}</h2>
                <p id="bar-address-${index + 1}" class="bar-address">${bar.address || "Address not available."}</p>
                <p id="bar-desc-${index + 1}" class="bar-desc">${bar.description || "No description available."}</p>
            </div>
            <div class="bar-popularity">
                <h3>Current Popularity</h3>
                <p>
                    Average: ${averagePopularity}, 
                    Live: ${livePopularity !== "Not Available" ? livePopularity : "N/A"}, 
                    ${differenceText}
                </p>
                <p>Average Review Score: ${averageReviewScore}</p>
            </div>
        `;
        mainContainer.appendChild(barElement);
    });

    // Add pagination controls
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination";
    paginationContainer.innerHTML = `
        <button id="prevPage" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
        <span>Page ${currentPage} of ${Math.ceil(datasetItems.length / itemsPerPage)}</span>
        <button id="nextPage" ${currentPage === Math.ceil(datasetItems.length / itemsPerPage) ? "disabled" : ""}>Next</button>
    `;
    mainContainer.appendChild(paginationContainer);

    // Add event listeners for pagination buttons
    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            displayItems(currentPage);
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        if (currentPage < Math.ceil(datasetItems.length / itemsPerPage)) {
            currentPage++;
            displayItems(currentPage);
        }
    });
}

(async () => {
    try {
        // Step 1: Fetch the list of runs for the actor
        const runsResponse = await fetch(actorRunsUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        if (!runsResponse.ok) {
            throw new Error(`HTTP error! status: ${runsResponse.status}`);
        }

        const runsData = await runsResponse.json();
        console.log("Runs API Response:", runsData); // Log the response

        // Step 2: Check if the runs are nested under `data.items`
        if (!runsData.data || !runsData.data.items || runsData.data.items.length === 0) {
            throw new Error("No runs found for the actor.");
        }

        // Step 3: Use the first run (index 0)
        const firstRun = runsData.data.items[runsData.data.items.length - 1]; // Get the last run
        if (!firstRun) {
            throw new Error("No runs found for the actor.");
        }

        console.log("First Run:", firstRun); // Log the first run

        // Step 4: Fetch dataset items from the first run
        const datasetUrl = `https://api.apify.com/v2/datasets/${firstRun.defaultDatasetId}/items?token=apify_api_PZji7Z8F7bWw1AEQY1o3JEYfvYDxFB456Iic`;
        const datasetResponse = await fetch(datasetUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        if (!datasetResponse.ok) {
            throw new Error(`HTTP error! status: ${datasetResponse.status}`);
        }

        datasetItems = await datasetResponse.json();
        console.log("Dataset items from the first run:", datasetItems);

        // Step 5: Display the first page of items
        displayItems(currentPage);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
})();