import { DFS } from '../util/util';
import Layer from './layer';
import Broadcast from '../Broadcast/Broadcast';
import shapes from './shapes';
import { Shape } from '../shape/BaseShape';
import { Group } from '../shape/Group';
import { Composite } from '../shape/composite';
 
// 图形类
export type ShapeType = Shape | Group | Composite;



// 容器管理器：管理所有layer
export class LayerManager {
    private container: HTMLElement;
    private containerSize: number[];

    // 默认zIndex为100
    private defaultZIndex: number;
    // 保存所有layer
    private layerMap: object;
    // 总图形数量
    private totalShapeCount: number;

    constructor(containerEle: HTMLElement) {
        this.defaultZIndex = 100;
        this.totalShapeCount = 0;
        this.container = containerEle;
        this.containerSize = [this.container.offsetWidth, this.container.offsetHeight];
        this.layerMap = {};

        //初始化广播器(监听者：容器管理器的界面克隆方法)
        Broadcast.addListener('clone', this.clone.bind(this));

        //初始化广播器(监听者：容器管理器的界面重刷方法)
        Broadcast.addListener('update', this.update.bind(this));
        //初始化广播器(监听者：容器管理器的界面添加方法)
        Broadcast.addListener('append', this.append.bind(this));
        //初始化广播器(监听者：容器管理器的界面移除方法)
        Broadcast.addListener('remove', this.remove.bind(this));
    }

    private createLayer(zIndex: number) {
        this.layerMap[zIndex] = new Layer(zIndex, this.defaultZIndex, this.container, this.containerSize);
    }

    /**---------------------公开方法----------------------- */

    public getHeight(): number {
        return this.containerSize[0];
    }

    public getWidth(): number {
        return this.containerSize[1];
    }

    public getTotalCount(): number {
        for(let index in this.layerMap) {
            this.totalShapeCount += this.layerMap[index].getCount();
        }

        return this.totalShapeCount;
    }

    public getLayerMap() {
        return this.layerMap;
    }


    
    public append(appendInfo): void {
        let z = appendInfo['zIndex'];

        if(this.layerMap[z] === undefined) {
            this.createLayer(z);
        }

        this.layerMap[z].append(appendInfo['shape']);
    }

    public remove(removeInfo): void {
        let z = removeInfo['zIndex'];

        this.layerMap[z].remove(removeInfo['shape']);

        if(this.layerMap[z].getCount() === 0) {
            this.destroyLayer(z);
        }
    }

    public destroyLayer(zIndex: number) {
        this.container.removeChild(this.layerMap[zIndex].getCanvasElement());
        delete this.layerMap[zIndex];
    }

    public update(zIndex: number) {
        this.layerMap[zIndex].update();
    }

    public clear(): void {
        for(let z in this.layerMap) {
            this.layerMap[z].clear();

            if(z !== '0') {
                this.destroyLayer(parseInt(z));
            }
        }
    }

    public clone(shape: ShapeType): ShapeType {
        if(shape.attr('type') === 'Group') {
            let tempGroup = new shapes.Group((<Group>shape).config());

            DFS((<Group>shape).getShapeList(), item => {
                tempGroup.append(this.clone(item));
            });

            return tempGroup;
        }
        else if(shape.attr('type') === 'Composite') {
            let tempComposite = new shapes.Composite((<Composite>shape).config());

            DFS((<Composite>shape).getShapeList(), item => {
                tempComposite.join(<Shape | Composite>this.clone(item));
            });

            return tempComposite;
        }
        else {
            return new shapes[shape.attr('type')](shape.config());
        }
    }

}







