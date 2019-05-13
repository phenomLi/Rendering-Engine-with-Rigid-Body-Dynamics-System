import BodyHeap from "./bodyHeap";
import { Body } from "./body/body";
import { PolygonBody } from "./body/PolygonBody";
import { CirBody } from "./body/CircleBody";
import { RectBody } from "./body/RectBody";
import RendererCreator from "../render/core";
import Motion from "./motion/core";
import { vector } from "../math/vector";
import { Boundary, BoundaryTop, BoundaryRight, BoundaryBottom, BoundaryLeft } from "./boundary/Boundary";
import BoundariesManager from "./boundary/core";
import CollisionManager from "./collision/core";
import ForceGenerator, { Gravity, LinearDrag, AngularDrag } from "./force/globalForce";
import ForceManager from './force/forceManager';
import { TriBody } from "./body/TriBody";



class WorldConfig {
    // 重力
    gravity: vector;
    // 线速度阻尼
    linearDrag: vector;
    // 角速度阻尼
    angularDrag: number;
}


const body = {
    Polygon: PolygonBody,
    Circle: CirBody,
    Rect: RectBody,
    Tri: TriBody,
    BoundaryTop: BoundaryTop,
    BoundaryRight: BoundaryRight,
    BoundaryBottom: BoundaryBottom,
    BoundaryLeft: BoundaryLeft
};


type BodyType = Body | Boundary;


/**
 * 物理世界构建器
 */
export default class WorldCreator {
    // 将渲染器暴露
    public Renderer: RendererCreator;
    // 刚体序列
    private bodyHeap: BodyHeap;
    // 碰撞检测器
    private collisionManager: CollisionManager;
    // 运动器
    private motion: Motion;
    // 边界管理器
    private boundariesManager: BoundariesManager;
    // 全局力管理器
    private forceManager: ForceManager;

    // 刚体对象集合
    public body: object;

    private opt;
    private gravity: ForceGenerator;
    private linearDrag: ForceGenerator;
    private angularDrag: ForceGenerator;

    constructor(containerEle: HTMLElement, opt: WorldConfig) {
        // 初始化渲染器
        this.Renderer = new RendererCreator(containerEle, opt);

        // 初始化刚体堆
        this.bodyHeap = new BodyHeap();

        // 初始化边界管理器
        this.boundariesManager = new BoundariesManager([this.getWidth(), this.getHeight()]);

        // 初始化碰撞检测器
        this.collisionManager = new CollisionManager(this.bodyHeap.getHeap(), this.boundariesManager);
        // 初始化全局力管理器
        this.forceManager = new ForceManager();

        // 初始化运动模拟器
        this.motion = new Motion(this.bodyHeap.getHeap(), this.collisionManager, this.forceManager);

        this.body = body;

        // 设置全局作用力
        this.initGlobalForce(opt);
    }

    /**------------------------------------------------------- */

    private initGlobalForce(opt) {
        this.opt = opt;
        
        this.opt.gravity = opt.gravity || [0, 5];
        this.opt.linearDrag = opt.linearDrag || [0.2, 0];
        this.opt.angularDrag = opt.angularDrag || 0.15;

        this.gravity = new Gravity(opt.gravity);
        this.linearDrag = new LinearDrag(opt.linearDrag);
        this.angularDrag = new AngularDrag(opt.angularDrag);

        this.forceManager.addLinearForce(this.gravity);
        this.forceManager.addLinearForce(this.linearDrag);
        this.forceManager.addAngularForce(this.angularDrag);
    }

    public setGlobalForce(opt) {
        this.opt = Object.assign(this.opt, opt);

        this.gravity.set(this.opt.gravity);
        this.linearDrag.set(this.opt.linearDrag);
        this.angularDrag.set([this.opt.angularDrag]);
    }


    /**------------------------------------------------------ */

    getWidth(): number {
        return this.Renderer.getWidth();
    }

    getHeight(): number {
        return this.Renderer.getHeight();
    }

    getBodyCount(): number {
        return this.Renderer.getShapesCount();
    }

    addWorldStepFn(fn: Function) {
        this.motion.addWorldStepFun(fn);
    }
 
    append(body: BodyType | BodyType[]) {
        if(Array.isArray(body)) {
            body.map(item => this.append(item));
        }
        else {
            if(body instanceof Boundary) {
                this.boundariesManager.add(body);
            }
            else {
                this.Renderer.append(body.getShape());
                this.bodyHeap.append(body);
            }
        }
    }

    remove(body: BodyType) {
        if(body instanceof Boundary) {
            this.boundariesManager.remove(body);
        }
        else {
            this.Renderer.remove(body.getShape());
            this.bodyHeap.remove(body.getId());
        }
    }

    clear() {
        this.Renderer.clear();
        this.bodyHeap.clear();
    }

    bind(event: string, fn: (ev) => void) {
        this.Renderer.bind(event, fn);
    }

    // 暂停模拟
    pause() {
        this.motion.pause();
    }

    // 开始模拟
    start() {
        this.motion.start();
    }
}