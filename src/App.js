import './app.css'
import * as THREE from 'three'
import * as dat from 'dat.gui'
import vertex from './shader/vertex.glsl'
import fragment from './shader/fragment.glsl'

const OrbitControls = require('three-orbit-controls')(THREE)
const fontUrl = require('./static/helvetiker_regular.typeface')

console.clear()


export class App {

  constructor({ el }) {
    this.container = el

    this.setSettings = this.setSettings.bind(this)
    this.tick = this.tick.bind(this)
    this.play = this.play.bind(this)
    this.pause = this.pause.bind(this)
    this.render = this.render.bind(this)
    this.addObjects = this.addObjects.bind(this)
    this.onResize = this.onResize.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)

    this.init.call(this)
  }

  init() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.time = 0
    this.paused = false

    this.mouse = new THREE.Vector2(0, 0)
    this.mouseTarget = new THREE.Vector2(0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0xeeeeee, 1)
    this.renderer.physicallyCorrectLights = true
    this.renderer.outputEncoding = THREE.sRGBEncoding

    this.container.append(this.renderer.domElement)

    const frustumSize = 3
    this.aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.OrthographicCamera(
      frustumSize * this.aspect / -2,
      frustumSize * this.aspect / 2,
      frustumSize / 2,
      frustumSize / -2, -1000
    )
    this.camera.position.z = 2
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.raycaster = new THREE.Raycaster()
    this.scene = new THREE.Scene()

    this.raycaster = new THREE.Raycaster()
    this.objects = new Map()

    this.setSettings()
    this.addObjects()
    this.onResize()
    this.tick()


    window.addEventListener("resize", this.onResize)
    window.addEventListener("mousemove", this.onMouseMove)
    window.addEventListener("touchmove", this.onTouchMove)
    window.addEventListener('visibilitychange', () => document.hidden ? this.pause() : this.play())
  }

  onTouchMove(ev) {
    const touch = ev.targetTouches[0]
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY })
  }

  onMouseMove(ev) {
    const raycaster = this.raycaster
    this.mouse = {
      x: (ev.pageX / this.width - 0.5) * 2,
      y: (1 - ev.pageY / this.height - 0.5) * 2
    }

    raycaster.setFromCamera(
      {
        x: (ev.clientX / window.innerWidth) * 2 - 1,
        y: -(ev.clientY / window.innerHeight) * 2 + 1
      },
      this.camera
    )
    // var intersections = raycaster.intersectObjects(this.objects)
    // if (intersections.length > 0) {
    //   const intersect = intersections[0]
    // }
  }

  addObjects() {
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: '#extension GL_OES_standard_derivatives'
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: 'f', value: 0 },
        rotation: { type: 'f', value: 0 },
        repeat: { type: 'f', value: 0 },
        lineWidth: { type: 'f', value: 0 },
        resolution: { type: 'v4', value: new THREE.Vector4() },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment,
    })
    this.objects.set('plane',
      new THREE.Mesh(
        new THREE.PlaneGeometry(3 * this.aspect - .2, 2.8, 1, 1),
        this.material
      )
    )
    this.scene.add(this.objects.get('plane'))
    new THREE.FontLoader()
      .load(fontUrl, font => {
        const geometry = new THREE.TextGeometry('mimic', {
          font,
          size: 1,
          height: 0.2,
          curveSegments: 12,
          bevelEnabled: false
        })
        geometry.translate(-1.75, -0.4, -0.2)
        this.objects.set('text',
          new THREE.Mesh(
            geometry,
            this.material
          )
        )
        this.objects.get('text').position.z = 0.5
        this.scene.add(this.objects.get('text'))
      })
  }

  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180
    const height = Math.abs(
      this.camera.position.z * Math.tan(fovInRadians / 2) * 2
    )

    return { width: height * this.camera.aspect, height }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  tick() {
    if (this.paused) return
    this.time += 0.05

    this.mouseTarget.x -= 0.1 * (this.mouseTarget.x - this.mouse.x)
    this.mouseTarget.y -= 0.1 * (this.mouseTarget.y - this.mouse.y)

    if (this.objects.get('text')) {
      this.objects.get('text').rotation.y = this.mouseTarget.x / 4
      this.objects.get('text').rotation.x = this.mouseTarget.y / 4
    }

    this.material.uniforms.time.value = this.time
    this.material.uniforms.rotation.value = this.settings.rotation
    this.material.uniforms.repeat.value = this.settings.repeat
    this.material.uniforms.lineWidth.value = this.settings.lineWidth
    this.render()
    requestAnimationFrame(this.tick)
  }

  onResize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height

    this.material.uniforms.resolution.value.x = this.width
    this.material.uniforms.resolution.value.y = this.height
    this.material.uniforms.resolution.value.z = 1
    this.material.uniforms.resolution.value.w = 1

    this.camera.updateProjectionMatrix()
  }

  setSettings() {
    this.settings = {
      time: 0,
      rotation: Math.PI / 4,
      lineWidth: 0.3,
      repeat: 10
    }
    this.gui = new dat.GUI()
    this.gui.add(this.settings, 'rotation', 0, Math.PI, 0.01)
    this.gui.add(this.settings, 'repeat', 0, 100, 0.01)
    this.gui.add(this.settings, 'lineWidth', 0, 1, 0.01)
  }

  pause() {
    this.paused = true
  }

  play() {
    this.paused = false
  }

}
