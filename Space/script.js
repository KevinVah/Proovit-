document.addEventListener("DOMContentLoaded", function(e){
    let currentPriceList = {};
    const filterForm = document.querySelector("#filterForm");
    const possibleRoutes = {
        "Mars": ["Venus"],
        "Mercury": ["Venus"],
        "Venus": ["Earth", "Mercury"],
        "Earth": ["Jupiter", "Uranus"],
        "Jupiter": ["Mars", "Venus"],
        "Saturn": ["Earth", "Neptune"],
        "Uranus": ["Saturn", "Neptune"],
        "Neptune": ["Mercury", "Uranus"]
    }

    const getRoute = (from, to, visited = []) => {
        let routes = [], extRoutes = [];
        visited.push(from);
        possibleRoutes[from].forEach(pl => {
            if(!visited.includes(pl)){
                if(pl == to){
                    routes.push([from, to]);
                }

                else{
                    extRoutes = getRoute(pl, to, visited);
                    if(extRoutes.length){
                        extRoutes.forEach(pl => {
                            let newRoute = pl;
                            newRoute.unshift(from);
                            routes.push(newRoute);
                        })
                    }
                }
            }
        });
        return routes;
    }

    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent("https://cosmos-odyssey.azurewebsites.net/api/v1.0/TravelPrices")}`,).then(response => response.json())
    .then(result => {
        currentPriceList = JSON.parse(result.contents);
    });

    filterForm.addEventListener("submit", function(e){
        e.preventDefault();
        let origin = document.querySelector("#travellingFrom").value;
        let destination = document.querySelector("#travellingTo").value;
        let dateStart = document.querySelector("#dateStart").value;
        let company = document.querySelector("#companySelect").value;

        let routes = getRoute(origin, destination);

        let plans = [];

        routes.forEach(route => {
            let routePlan = [];
            for(let i=0; i<route.length; i++){
                if(route.length > i+1){
                    let plan = {};
                    plan.from = route[i];
                    plan.to = route[i+1];
                    plan.flights = [];
                    currentPriceList.legs.forEach(leg => {  
                        if(leg.routeInfo.from.name == route[i] && leg.routeInfo.to.name == route[i+1]){
                            plan.distance = leg.routeInfo.distance;
                            leg.providers.forEach(pv => {
                                if(company != "any" && pv.company.name == company){
                                    plan.flights.push(pv);
                                }
                                else if(company == "any"){
                                    plan.flights.push(pv);
                                }
                            })
                        }
                    })
                    routePlan.push(plan);
                }
            }
            plans.push(routePlan);
        })

        const getFlightConnections = (plan, idx, startDate) =>{
            let entry = [];
            plan[idx].flights.forEach(fl => {
                let stDate = new Date(startDate);
                let flDate = new Date(fl.flightStart);
                if(flDate > stDate){
                    let flObj = {flight: fl};
                    flObj.from = plan[idx].from;
                    flObj.to = plan[idx].to;
                    flObj.distance = plan[idx].distance;
                    if(idx+1 < plan.length){
                        flObj.next = getFlightConnections(plan, idx+1, fl.flightEnd);
                        entry.push(flObj);
                    }
                    else{
                        entry.push(flObj);
                    }
                }
            })

            return entry;
        }

        let possibleFlights = [];

        plans.forEach(plan => {
            possibleFlights.push(getFlightConnections(plan, 0, dateStart));
        })

        let finalRoutes = [];

        const getFinalRoutes = (ft, final, rt = []) =>{
            if(ft && ft.length){
                ft.forEach(flt => {
                    let nrt = [];
                    rt.forEach(em => {
                        nrt.push(em);
                    });
                    if(flt.to == final){
                        nrt.push({from: flt.from, to: flt.to, distance: flt.distance, flight: flt.flight});
                        finalRoutes.push(nrt);
                    }
                    else if(Object.keys(flt).includes("next") && flt.next.length){
                        nrt.push({from: flt.from, to: flt.to, distance: flt.distance, flight: flt.flight});
                        getFinalRoutes(flt.next, final, nrt);
                    }
                })
            }
        }

        possibleFlights.forEach(ft => {
            getFinalRoutes(ft,destination);
        })

        console.log(finalRoutes);

        let tableContainer = document.querySelector(".routeTable tbody");

        tableContainer.innerHTML = '';

        finalRoutes.forEach((rt, idx) => {
            let totalDistance = 0;
            let totalPrice = 0;
            let route = '';
            let companies = '';
            rt.forEach((fl, idx) => {
                totalDistance += fl.distance;
                totalPrice += fl.flight.price;
                if(idx == 0){
                    route += fl.from + ' -> ' + fl.to;
                }
                else{
                    route += ' -> ' + fl.to;
                }
                let dateFrom = new Date(fl.flight.flightStart);
                let dateTo = new Date(fl.flight.flightEnd);
                companies += `Flight ${idx}: ${fl.flight.company.name} (${dateFrom.toDateString()} --> ${dateTo.toDateString()})</br>`;
            })

            tableContainer.innerHTML += `<td>${route}</td><td>${totalDistance}</td><td>${companies}</td><td>${totalPrice}</td>`;

        })

        document.querySelectorAll(".routeTable th").forEach(th => {
            th.addEventListener("click", tableSortable);
        });

    })

    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

    const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
        v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
        )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

    function tableSortable(){
        let th = this;
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        Array.from(tbody.querySelectorAll('tr'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
            .forEach(tr => tbody.appendChild(tr) );
    }
});