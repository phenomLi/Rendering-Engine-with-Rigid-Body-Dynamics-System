import { Shape, shapeConfig } from "../../shape/BaseShape";
import BoundRect from "../collision/boundRect";
import { polygonConfig } from "../../shape/Polygon";
import { triangleConfig } from "../../shape/Triangle";
import { rectangleConfig } from "../../shape/Rectangle";
import { circleConfig } from "../../shape/Circle";
import { vector, Vector } from "../../math/vector";
import ForceManager from "../force/forceManager";
import { calcStandardDeviation } from "../../util/util";

import shapes from './../../render/shapes';

/**
 * static:
 * 1. pos: 固定位置，不固定旋转
 * 2. total: 完全固定 
 * 3. none: 自由（默认值）
 */
export enum staticType {
    none = 0,
    position = 1,
    total = 2
}


export class Nature {
    // 质量
    mass: number;
    // 静态
    static: string;
    // 初始线速度
    linearVelocity: vector;
    // 初始角速度
    angularVelocity: number;

    // 摩擦力
    friction: number;
    // 反弹系数
    restitution: number;
}


/**
 * 刚体状态
 * 0：初始化，还没进入模拟阶段
 * 1：模拟阶段，在每一帧中参与运算
 * 2：休眠阶段，不参与运算，节省性能
 */
export enum state {
    init = 0,
    simulate = 1,
    sleep = 2
}


export class BodyConfig {
    // 图形样式
    shape:  shapeConfig | polygonConfig | triangleConfig | rectangleConfig | circleConfig;

    // 图形材质
    nature: Nature;

    // 碰撞后的回调
    collided: ((b: Body) => void);
    // 分离后的回调
    separated: (() => void);
}


// 刚体
export class Body {
    protected id: Symbol;
    protected shape: Shape;
    // AABB包围盒
    protected boundRect: BoundRect;
    // 模拟状态
    public state: number;
    // 是否碰撞
    public isCollide: boolean;

    //---------------------------物理量-------------------

    // 线速度
    public linearVel: vector;
    // 角速度
    public angularVel: number;
    // 线加速度
    public linearAcc: vector;
    // 角加速度
    public angularAcc: number;
    // 位置
    public pos: vector;
    // 方向
    public rot: number;
    // // 几何中心
    // public center: vector;
    // 质量
    public mass: number;
    // 质量的倒数
    public inverseMass: number;
    // 摩擦力
    public friction: number;
    // 反弹系数
    public restitution: number;
    // 面积
    public area: number;
    // 密度
    public density: number;
    // 质心
    public centroid: vector;
    // 转动惯量
    public rotationInertia: number;
    // 扭矩
    public torque: number;

    // 固定
    public static: number; 

    public curMotion: number;
    // 记录10帧内的运动值
    public frameMotionListIn10: number[];
    
    //----------------------------------------------------

    protected collidedFn: Function;
    protected separatedFn: Function;


    constructor(opt: BodyConfig, type: string) {
        this.shape = new shapes[type](opt.shape);
        this.id = this.shape.attr('id');

        this.initPhysicalData(opt);
    }

    // 初始化物理量
    initPhysicalData(opt: BodyConfig) {
        this.pos = this.shape.attr('center');
        this.rot = this.shape.attr('rotate');

        this.linearAcc = [0, 0];
        this.linearVel = [0, 0];
        this.angularVel = 0;
        this.angularAcc = 0;
        this.mass = 0;
        this.inverseMass = -1;
        this.friction = 0;
        this.restitution = 0.9;
        this.area = 0;
        this.density = 0.01;
        this.centroid = [0, 0];
        this.rotationInertia = 0;
        this.torque = 0;
        this.static = staticType.none;
        this.state = state.init;
        this.isCollide = false;
        this.curMotion = 0;
        this.frameMotionListIn10 = [];
        
        if(opt.nature) {
            this.linearVel = opt.nature.linearVelocity || this.linearVel;
            this.angularVel = opt.nature.angularVelocity || this.angularVel;
            this.friction = opt.nature.friction || this.friction;
            this.restitution = opt.nature.restitution || this.restitution;
            this.mass = opt.nature.mass || this.mass;

            if(opt.nature.static) {
                switch (opt.nature.static) {
                    case 'none': {
                        this.static = staticType.none;
                        break;
                    }
                    case 'position': {
                        this.static = staticType.position;
                        break;
                    }
                    case 'total': {
                        this.static = staticType.total;
                        break;
                    }
                    default: {
                        this.static = staticType.none;
                    }
                }
            }
            else {
                this.static = staticType.none;
            }
        }

        this.collidedFn = opt.collided || (() => {});
        this.separatedFn = opt.separated || (() => {});
    }
    
    // 初始化刚体数据
    initBodyData() {
        throw '此方法必须由子类重写';
    }

    // 设置质量相关的数据
    // 设置质量相关的数据
    setMassData() {
        this.area = this.calcArea();

        // 如果质量被用户定义了，那就重新计算密度
        if(this.mass !== 0) {
            this.density = this.calcDensity();
        }
        // 否则根据面积计算面积，密度使用默认密度（0.01）
        else {
            this.mass = this.area*this.density;
        }

        this.centroid = this.calcCentroid();
        this.rotationInertia = this.calcRotationInertia();

        // 若此刚体是固定刚体，则质量趋于无穷大，则质量的倒数无穷小 --> 0
        if(this.static === staticType.position || this.static === staticType.total) {
            this.inverseMass = 0;
        }
        else {
            this.inverseMass = 1/this.mass;
        }
    }

    // 计算面积
    calcArea(): number {
        throw '此方法必须由子类重写';
    }

    // 计算密度
    calcDensity(): number {
        throw '此方法必须由子类重写';
    }

    // 计算质心
    calcCentroid(): vector {
        throw '此方法必须由子类重写';
    }

    // 计算转动惯量
    calcRotationInertia(): number {
        throw '此方法必须由子类重写';
    }

    //---------------------------------------------------------------//

    // 获取图形
    getShape(): Shape {
        return this.shape;
    }

    // 获取信息
    getInfo(): any {
        throw '此方法必须由子类重写';
    }

    // 获取ID
    getId(): Symbol {
        return this.id;
    }

    // 事件绑定
    bind(event: string, fn) {
        this.shape.bind(event, fn);
    }

    /**----------------------------包围盒------------------------------ */
    
    // 创建包围盒（需重载）
    createBoundRect(): BoundRect {
        throw '此方法必须由子类重写';
    }

    // 更新包围盒
    updateBoundRect(updateInfo: any) {
        throw '此方法必须由子类重写';
    }

    // 获取包围盒
    getBoundRect(): BoundRect {
        return this.boundRect;
    }

    /**----------------------根据速度加速度积分更新位置 ------------------*/
 
    // 位移积分
    integratePosition() {
        this.linearVel = Vector.add(this.linearVel, this.linearAcc);
        this.setPos(Vector.add(this.linearVel, this.pos));
    }

    // 方向（旋转）积分
    integrateRotation() {
        this.angularVel += this.angularAcc;

        if (this.rot >= 360) this.rot %= 360;
        this.setRotation(this.rot + this.angularVel);
    }

    update(forceManager: ForceManager) {
        // 添加应用重力和阻力
        forceManager.applyLinearForce(this);
        forceManager.applyAngularForce(this);

        this.integratePosition();
        this.integrateRotation();

        forceManager.clear(this);

        //this.isTimeToSleep(this.pos, this.rot);
    }

    // 是否需要休眠
    isTimeToSleep(lv: vector, av: number) {
        let motion = Vector.len(lv)*Vector.len(lv) + av*av,
            s = 0;

        if(this.frameMotionListIn10.length >= 20) {
            this.frameMotionListIn10.shift();
        }
        
        this.frameMotionListIn10.push(motion);

        if(this.frameMotionListIn10.length === 20) {
            
            s = calcStandardDeviation(this.frameMotionListIn10);

            if(s < 500) {

                this.state = state.sleep;
            }
            else {
                this.state = state.simulate;
            }
        }
    }

    /**------------------------------更新shape图形----------------- */

    setLinearVel(vel: vector) {
        this.linearVel = vel;
    }

    setAngularVel(vel: number) {
        this.angularVel = vel;
    }

    setPos(pos: vector) {
        let shapeX = this.shape.attr('x'),
            shapeY = this.shape.attr('y'),
            dPos = Vector.sub(pos, this.pos);

        this.pos = pos;

        this.updateBoundRect({
            type: 'pos',
            val: dPos
        });

        this.shape.attr('x', shapeX + dPos[0]).attr('y', shapeY + dPos[1]);
    }


    setRotation(deg: number) {
        let dDeg = deg - this.rot;

        this.rot = deg;

        this.updateBoundRect({
            type: 'rot',
            val: dDeg,
        });

        this.shape.attr('rotate', deg);
    }

    /**------------------------------碰撞------------------------- */

    // 碰撞事件
    collided(opp: Body) {
        this.collidedFn.call(this, opp);
    }

    // 分离事件
    separated() {
        this.separatedFn.call(this);
    }
}