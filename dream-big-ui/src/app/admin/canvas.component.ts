import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

interface Point {
    x: number;
    y: number;
}

interface Polygon {
    points: Array<Point>;
    highlight: boolean;
    colour: string;
}

interface StarCoord {
    spike_x: number;
    spike_y: number;
    edge_x: number;
    edge_y: number;
}

interface Category {
    name: string;
    score: number;
    colour: string;
}

@Component({
    selector: 'app-canvas',
    templateUrl: './canvas.component.html'
})
export class CanvasComponent implements AfterViewInit {
    @ViewChild('canvas')
    canvas: ElementRef<HTMLCanvasElement> = {} as ElementRef<HTMLCanvasElement>;
    public context: CanvasRenderingContext2D = {} as CanvasRenderingContext2D;
    categories: Array<Category> = [];
    // categories: Array<Category> = [
    //     {
    //         name: "aaa",
    //         score: 10,
    //         colour: 'firebrick'
    //     },
    //     {
    //         name: "Experience",
    //         score: 10,
    //         colour: 'turquoise'
    //     },
    //     {
    //         name: "Knowledge",
    //         score: 10,
    //         colour: 'khaki'
    //     },
    //     {
    //         name: "Teamwork",
    //         score: 10,
    //         colour: 'skyblue'
    //     },
    //     {
    //         name: "Networking",
    //         score: 10,
    //         colour: 'DarkSeaGreen'
    //     },
    // ];

    starSize: number = 20;
    c_x: number = 400;
    c_y: number = 200;
    rotation: number = 0;
    catPolygons: Array<Polygon> = [];
    firstPolygonIdx: number = -1;
    polygonCollision: boolean = false;
    numSpikes: number = 7;

    ngAfterViewInit(): void {
        this.context = this.canvas.nativeElement.getContext('2d')!;
        this.createCategories();
        this.makeDrawStar(true);
    }

    public createCategories() {
        this.categories = [];
        for (var i = 0; i < this.numSpikes; i++) {
            const cat = {
                name: 'aaa',
                score: 10,
                colour: this.getRandomColourCode()
            }
            this.categories.push(cat);
        }
    }

    public changeSpikes() {
        this.createCategories();
        this.makeDrawStar(true);
    }

    public onMouseMove(e: any) {
        this.checkCatPolygonCollisions(e.offsetX, e.offsetY);
    }

    private checkCatPolygonCollisions(x: number, y: number) {
        this.firstPolygonIdx = -1;
        for (var i = 0; i < this.catPolygons.length; i++) {
            const polygon = this.catPolygons[i];
            var is_inside = this.pointIsInPoly(x, y, polygon.points);
            if (is_inside) {
                this.catPolygons[i].highlight = true;
                this.firstPolygonIdx = i;
            } else {
                this.catPolygons[i].highlight = false;
            }
        }
        // use polygonCollision to ensure the cat polygons are redrawn the frame after collision stops.
        // this allows the polygons to update one final time, and clears the highlighted polygon
        if (this.firstPolygonIdx >= 0 || this.polygonCollision) {
            this.makeDrawStar(false);
            this.polygonCollision = this.firstPolygonIdx >= 0;
        }
    }

    public randomiseCatScores() {
        this.categories.forEach((cat) => {
            cat.score = Math.floor(Math.random() * 100 + 1);
        })
        this.makeDrawStar(true);
    }

    public redrawStar() {
        this.makeDrawStar(true);
    }

    public makeDrawStar(hasChanged: boolean) {
        // clear the canvas so the star can be redrawn
        this.context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

        // draw the star to the canvas and retrieve the points for all spikes and inner vertices
        let starCoords = this.drawStar(this.c_x, this.c_y, this.numSpikes, this.starSize * 8, this.starSize * 3);

        // check if the category polygons should be recreated
        if (hasChanged || this.catPolygons.length == 0) {
            this.catPolygons = [];
            this.getCatPolygons(starCoords);
        }

        // check if the mouse has collided with a polygon
        if (this.firstPolygonIdx >= 0) {
            // reorder the polygon array to ensure the one that has been collided with is first in the list
            this.catPolygons = this.reorder(this.catPolygons, this.firstPolygonIdx);

            // to have the full outline of the collided polygon shown, reverse the list;
            // this.category_polygons.reverse();
        }

        this.drawCatPolygons();
    }

    private getCatPolygons(starCoords: Array<StarCoord>) {
        // each polygon connects to two inner vertices, but only has the values for one.
        // to get the opposite point of the inner vertex, use the value from the previous polygon in the list
        var prev_x = starCoords[starCoords.length - 1].edge_x;
        var prev_y = starCoords[starCoords.length - 1].edge_y;
        for (var i = 0; i < this.categories.length; i++) {
            var score = this.categories[i].score;
            // these magic numbers should be replaced with constants
            // limit the score to be between 1-100 to ensure it can't escape the star shape
            // the outerStar radius is scaled by a factor of 8 to achieve the ratio for the desired star shape, so the score must be scaled simiarly
            score = Math.min(this.starSize * 8 / 100 * score, this.starSize * 8 / 100 * 100);

            // find the point which has a distance of score along the line defined by the center point of the star (c_x, c_y) and the point at the corresponding spike
            const p_xy = this.calculateLinePoint(this.c_x, this.c_y, starCoords[i].spike_x, starCoords[i].spike_y, score);

            // these points have been declared in a specific order, which is required to draw the polygon
            this.catPolygons.push({
                points: [
                    { x: this.c_x, y: this.c_y },
                    { x: starCoords[i].edge_x, y: starCoords[i].edge_y },
                    { x: p_xy.x, y: p_xy.y },
                    { x: prev_x, y: prev_y },
                ],
                highlight: false,
                colour: this.categories[i].colour
            });
            prev_x = starCoords[i].edge_x;
            prev_y = starCoords[i].edge_y;
        }
    }


    private drawCatPolygons() {
        for (var i = 0; i < this.catPolygons.length; i++) {
            const poly = this.catPolygons[i];
            var start_x = poly.points[0].x;
            var start_y = poly.points[0].y;
            this.context.beginPath();
            this.context.moveTo(start_x, start_y);
            for (var j = 1; j < poly.points.length; j++) {
                this.context.lineTo(poly.points[j].x, poly.points[j].y);
            }
            this.context.lineTo(start_x, start_y);
            this.context.closePath();
            if (poly.highlight) {
                this.context.lineWidth = 5;
                this.context.strokeStyle = 'gold';
            } else {
                this.context.lineWidth = 1;
                this.context.strokeStyle = 'black';
            }

            this.context.stroke();
            this.context.fillStyle = poly.colour;
            this.context.fill();
        }
    }

    /**
     * 
     * @param cx 
     * @param cy 
     * @param spikes 
     * @param outerRadius 
     * @param innerRadius 
     * @returns starCoords
     */
    private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): Array<StarCoord> {
        // use a ratio of 8:3 for outerRadius:innerRadius to get desired star shape
        var rotation_radians = this.rotation * Math.PI / 180;
        var rot = (Math.PI / 2 * 3) + rotation_radians;
        var x = cx + Math.cos(rot) * outerRadius;
        var y = cy + Math.sin(rot) * outerRadius;
        var step = Math.PI / spikes;

        this.context.strokeStyle = "black";
        this.context.beginPath();
        this.context.moveTo(x, y)
        const starCoords: any[] = [];

        for (var i = 0; i < spikes; i++) {
            let star_coord: StarCoord = {
                spike_x: 0,
                spike_y: 0,
                edge_x: 0,
                edge_y: 0,
            };

            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            star_coord.spike_x = x;
            star_coord.spike_y = y;
            this.context.lineTo(x, y)
            rot += step

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            star_coord.edge_x = x;
            star_coord.edge_y = y;
            this.context.lineTo(x, y)
            rot += step

            starCoords.push(star_coord);
        }
        this.context.closePath();
        this.context.lineWidth = 3;
        this.context.strokeStyle = 'black';
        this.context.stroke();
        this.context.fillStyle = 'lightgrey';
        this.context.fill();
        return starCoords;
    }


    /**
     * https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon/17490923#17490923
     * @param x 
     * @param y 
     * @param polygonPoints 
     * @returns boolean
     */
    private pointIsInPoly(x: number, y: number, polygonPoints: Array<Point>): boolean {
        var isInside = false;
        var minX = polygonPoints[0].x, maxX = polygonPoints[0].x;
        var minY = polygonPoints[0].y, maxY = polygonPoints[0].y;
        for (var n = 1; n < polygonPoints.length; n++) {
            var q = polygonPoints[n];
            minX = Math.min(q.x, minX);
            maxX = Math.max(q.x, maxX);
            minY = Math.min(q.y, minY);
            maxY = Math.max(q.y, maxY);
        }

        if (x < minX || x > maxX || y < minY || y > maxY) {
            return false;
        }

        var i = 0, j = polygonPoints.length - 1;
        for (j; i < polygonPoints.length; j = i++) {
            if ((polygonPoints[i].y > y) != (polygonPoints[j].y > y) &&
                x < (polygonPoints[j].x - polygonPoints[i].x) * (y - polygonPoints[i].y) / (polygonPoints[j].y - polygonPoints[i].y) + polygonPoints[i].x) {
                isInside = !isInside;
            }
        }

        return isInside;
    }

    /**
     * Find the point on a line given by two coordinates that is distance units away from x1,y1
     * 
     * @param x1 x1 position on given line
     * @param y1 y1 position on given line
     * @param x2 x2 position on given line
     * @param y2 y2 position on given line
     * @param distance the distance to travel on the given line to find the desired point
     * @returns a point on the given line that is distance units along it
     */
    private calculateLinePoint(x1: number, y1: number, x2: number, y2: number, distance: number) {
        var vx = x2 - x1;
        var vy = y2 - y1;
        var mag = Math.sqrt(vx * vx + vy * vy);
        vx /= mag;
        vy /= mag;
        var px = x1 + vx * (distance);
        var py = y1 + vy * (distance);
        return { x: px, y: py }
    }

    private reorder(data: Array<any>, index: number) {
        return data.slice(index).concat(data.slice(0, index))
    };

    private getRandomColourCode() {
        var makeColorCode = '0123456789ABCDEF';
        var code = '#';
        for (var count = 0; count < 6; count++) {
            code = code + makeColorCode[Math.floor(Math.random() * 16)];
        }
        return code;
    }

}