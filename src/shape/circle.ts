import { Shape, shapeConfig } from './BaseShape';


export class circleConfig extends shapeConfig {
    radius: number; //*
}


//绘制圆形
export class Circle extends Shape {
    private _radius: number; 

    constructor(config: circleConfig) {
        super(config, 'Circle');

        this._center = [this._x, this._y];
        this._radius = config.radius;

        this.initSetter();
        this.createPath();
    }

    config() {
        return {
            ...this.getBaseConfig(),
            radius: this._radius
        };
    }

    drawPath(): Shape {
        this.path = new Path2D();
        this.path.arc(this._x, this._y, this._radius, 0, 2*Math.PI, true);
        return this;
    }
} 