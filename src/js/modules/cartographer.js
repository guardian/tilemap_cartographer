import { Toolbelt } from '../modules/toolbelt'
import template from '../../templates/template.html'
import L from 'leaflet/dist/leaflet-src'
import '../modules/L.UTFGrid.js'
import '../modules/L.UTFGridCanvas.js'
import * as d3 from "d3"
import loadJson from '../modules/load-json/'
import Ractive from 'ractive'

export class Cartographer {

	constructor(data) {

        var self = this

        this.database = data

        this.toolbelt = new Toolbelt()

        this.database.currentIndex = 0

        this.database.dropdown = (self.database.mapping.map( (item) => item.data).length > 1) ? true : false ;

        this.database.currentBasemap = self.database.mapping[0].data;

        this.database.minZoom = self.database.mapping[0].minZoomlevel;

        this.database.maxZoom = self.database.mapping[0].maxZoomlevel;

        this.database.currentZoom = self.database.mapping[0].minZoomlevel;

        this.database.lat = self.database.settings[0].lat

        this.database.lng = self.database.settings[0].lng

        this.isMobile = self.toolbelt.mobileCheck()

        this.database.zoomOn = (self.isMobile) ? false : true ;

        this.isAndroidApp = (window.location.origin === "file://" && /(android)/i.test(navigator.userAgent) ) ? true : false ;  

        this.loader()

	}

    loader() {

        var self = this

        loadJson('<%= path %>/assets/places.json')
            .then((data) => {
                self.ractivate()
            })

    }

    createmap() {

        var self = this

        self.map = new L.Map('map', { 
                  renderer: L.canvas(),
                  center: [self.database.lat, self.database.lng], 
                  zoom: self.database.currentZoom,
                  scrollWheelZoom: (self.isMobile) ? false : true,
                  dragging: true,
                  zoomControl: true,
                  doubleClickZoom: (self.isMobile) ? false : true,
                  zoomAnimation: true,
                })

        self.map.options.minZoom = self.database.minZoom;
        self.map.options.maxZoom = self.database.maxZoom;

        L.tileLayer(`${self.database.currentBasemap}/{z}/{x}/{y}.png`).addTo(self.map);

        self.map.on('zoomend',function(e){
            self.database.currentZoom = self.map.getZoom();
        }); 

        self.map.on('dragend', function() {
            let latLng = self.map.getCenter()
            self.database.lat = latLng.lat
            self.database.lng = latLng.lng
        });

        var popup = L.popup({autoPan:false})

        var utilities = {

            commas: function(num) {
                var result = parseFloat(this[num]).toFixed();
                result = result.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
                return result
            },

            big: function(big) {

                var num = parseFloat(this[big]);

                if ( num > 0 ) {
                    if ( num > 1000000000 ) { return ( num / 1000000000 ).toFixed(1) + 'bn' }
                    if ( num > 1000000 ) { return ( num / 1000000 ).toFixed(1) + 'm' }
                    if (num % 1 != 0) { return num.toFixed(2) }
                    else { return num.toLocaleString() }
                }

                if ( num < 0 ) {
                    var posNum = num * -1;
                    if ( posNum > 1000000000 ) return [ "-" + String(( posNum / 1000000000 ).toFixed(1)) + 'bn'];
                    if ( posNum > 1000000 ) return ["-" + String(( posNum / 1000000 ).toFixed(1)) + 'm'];
                    else { return num.toLocaleString() }
                }

                return num;

            },

            decimals: function(items) {
                var nums = items.split(",")
                return parseFloat(this[nums[0]]).toFixed(nums[1]);
            }

        }

        var utfgrid = L.utfGrid(`${self.database.currentBasemap}/{z}/{x}/{y}.grid.json`);

        utfgrid.addTo(self.map);

        utfgrid.on('click', function(e){
            if (!e.data) return;
            popup.setLatLng(e.latlng)
                .setContent((self.toolbelt.contains(Object.values(e.data), null)) ? "No data available" : self.toolbelt.mustache(self.database.mapping[self.database.currentIndex].tooltip, {...utilities, ...e.data}))
                .openOn(self.map);
        });

        utfgrid.on('mouseover', function(e){
            popup.setLatLng(e.latlng)
                .setContent((self.toolbelt.contains(Object.values(e.data), null)) ? "No data available" : self.toolbelt.mustache(self.database.mapping[self.database.currentIndex].tooltip, {...utilities, ...e.data}))
                .openOn(self.map);
        });

        utfgrid.on('mouseout', function(e){
            popup.remove();
        });

        this.colourizer()

    }

    ractivate() {

        var self = this

        Ractive.DEBUG = /unminified/.test(function(){/*unminified*/});
        this.ractive = new Ractive({
            el: '#cartographer',
            data: self.database,
            template: template,
        })

        self.createmap()

        this.ractive.observe('currentIndex', function(index) {

            console.log(index)

            self.database.currentIndex = +index

            self.database.currentBasemap = self.database.mapping[index].data

            self.database.minZoom = self.database.mapping[index].minZoomlevel;

            self.database.maxZoom = self.database.mapping[index].maxZoomlevel;           

            self.map.remove()

            self.createmap()

        });

        //this.resizer()

    }

    resizer() {

        var self = this
        var to = null
        var lastWidth = document.querySelector(".interactive-container").getBoundingClientRect()
        window.addEventListener('resize', () => {
            var thisWidth = document.querySelector(".interactive-container").getBoundingClientRect()
            if (lastWidth != thisWidth) {
                window.clearTimeout(to);
                to = window.setTimeout(function() {
                    //self.zoomLevel = 1
                    //self.createMap()
                }, 500)
            }
        })

    }

    colourizer() {

        var self = this

        this.scaleType = self.database.mapping[self.database.currentIndex].scale.toLowerCase()

        this.keyColors = self.database.mapping[self.database.currentIndex].colours.split(",");

        this.thresholds = self.database.mapping[self.database.currentIndex].values.split(",");

        this.color = d3.scaleThreshold().domain(self.thresholds).range(self.keyColors)

        this.keyWidth = 290;

        if (this.keyWidth > this.width - 10) {
            this.keyWidth = this.width - 10
        }

        d3.select("#key svg").remove();

        this.keySvg = d3.select("#key").append("svg")
            .attr("width", self.keyWidth)
            .attr("height", "40px")
            .attr("id", "keySvg")
        
        this.keySquare = this.keyWidth / 10;

        const barHeight = 15
        const height = 30

        this.keyColors.forEach(function(d, i) {

            self.keySvg.append("rect")
                .attr("x", self.keySquare * i)
                .attr("y", 0)
                .attr("width", self.keySquare)
                .attr("height", barHeight)
                .attr("fill", d)
                .attr("stroke", "#dcdcdc")
        })

        this.thresholds.forEach(function(d, i) {

            self.keySvg.append("text")
                .attr("x", (i + 1) * self.keySquare)
                .attr("text-anchor", "middle")
                .attr("y", height)
                .attr("class", "keyLabel").text(self.toolbelt.niceNumber(d))
        })


    }

}
