import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import anime from 'animejs/lib/anime.es.js'

function day_night() {
    const now = new Date()
    const current_hour = now.getHours()
    if (current_hour < 20)
        return true
    return false
}

let day = day_night()
let animating = false
let sunbg = document.querySelector(".sun-background")
let mounbg = document.querySelector(".moon-background")
let scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 45)

function set_renderer() {
    const renderer = new THREE.WebGL1Renderer({alpha: true, antialias: true})
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.physicallyCorrectLights = true
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    document.body.appendChild(renderer.domElement)
    return renderer
}
let renderer = set_renderer()
let pmrem = new THREE.PMREMGenerator(renderer)

function set_sunlight() {
    const sunlight = new THREE.DirectionalLight(new THREE.Color("#FFFFFF").convertSRGBToLinear(), 1.5)
    sunlight.position.set(20, 10, 19)
    sunlight.castShadow = true
    sunlight.shadow.mapSize.width = 512
    sunlight.shadow.mapSize.height = 512
    sunlight.shadow.camera.near = 0.5
    sunlight.shadow.camera.far = 100
    sunlight.shadow.camera.right = 10
    sunlight.shadow.camera.left = -10
    sunlight.shadow.camera.bottom = -10
    sunlight.shadow.camera.top = 10
    scene.add(sunlight)
    return sunlight
}

function set_moonlight() {
    const moonlight = new THREE.DirectionalLight(new THREE.Color("#77ccff").convertSRGBToLinear(), 0)
    moonlight.position.set(-20, 10, 19)
    moonlight.castShadow = true
    moonlight.shadow.mapSize.width = 512
    moonlight.shadow.mapSize.height = 512
    moonlight.shadow.camera.near = 0.5
    moonlight.shadow.camera.far = 100
    moonlight.shadow.camera.right = 10
    moonlight.shadow.camera.left = -10
    moonlight.shadow.camera.bottom = -10
    moonlight.shadow.camera.top = 10
    scene.add(moonlight)
    return moonlight
}

function set_control() {
    const control = new OrbitControls(camera, renderer.domElement)
    control.target.set(0, 0, 0)
    control.dampingFactor = 0.05
    control.enableDamping = true
    return control
}

async function get_texture() {
    const texture = {
        bump: await new THREE.TextureLoader().loadAsync("assets/earthbump.jpg"),
        map: await new THREE.TextureLoader().loadAsync("assets/earthmap.jpg"),
        spec: await new THREE.TextureLoader().loadAsync("assets/earthspec.jpg"),
        plane: await new THREE.TextureLoader().loadAsync("assets/mask.png")
    }
    return texture
}

async function set_envmap() {
    const envmapTexture = await new RGBELoader().setDataType(THREE.FloatType).loadAsync("assets/belfast_farmhouse_2k.hdr")
    const envmap = pmrem.fromEquirectangular(envmapTexture).texture
    return envmap
}

function add_sphere(texture, envMap) {
    const material = new THREE.MeshPhysicalMaterial({map: texture.map, roughnessMap: texture.spec, bumpMap: texture.bump, 
    bumpScale: 0.05, sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color("#ff8a00").convertSRGBToLinear(), clearcoat: 0.5,
    envMap, envMapIntensity: 0.4})
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10, 70, 70),
        material
    )
    sphere.position.set(0, 0, 0)
    sphere.rotation.y += Math.PI * 1.35
    sphere.rotation.x += 0.15
    sphere.receiveShadow = true
    scene.add(sphere)
    return sphere
}

function rdm() {
    return Math.random() * 2 - 1
}

function makeplane(planeMesh, texture, envMap, scene) {
    let plane = planeMesh.clone()
    plane.scale.set(0.001, 0.001, 0.001)
    plane.position.set(0, 0, 0)
    plane.rotation.set(0, 0, 0)
    plane.updateMatrixWorld()

    plane.traverse((object) => {
        if(object instanceof THREE.Mesh) {
            object.name = "plane"
            object.material.envMap = envMap
            object.castShadow = true
            object.receiveShadow = true
        }
    });

    const geometry = new THREE.MeshPhysicalMaterial({
        envMap, envMapIntensity: 3,
        roughness: 0.4, metalness: 0, transmission: 1,
        transparent: true, opacity: 1, alphaMap: texture
    })
    let trail = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 2),
        geometry
    )
    trail.rotateX(Math.PI)
    trail.translateY(1.1)
    
    let group = new THREE.Group()
    group.add(plane)
    group.add(trail)
    scene.add(group)

    return {group, rot: Math.random() * Math.PI * 2.0,
        rad: Math.random() * Math.PI * 0.45 + 0.2,
        yoff: 10.5 + Math.random() * 1.0,
        randomAxis: new THREE.Vector3(rdm(), rdm(), rdm()).normalize(),
        randomAxisRot: Math.random() * Math.PI * 2
    }
}

async function set_plane(texture, envMap) {
    let plane = (await new GLTFLoader().loadAsync("assets/3d/scene.glb")).scene.children[0]
    let rand = Math.random() * 5 + 7
    rand = Math.floor(rand)
    let planeDT = []
    for (let c = 0 ; c < rand; c++) {
        planeDT.push(makeplane(plane, texture.plane, envMap, scene))
    }
    return planeDT
}

function animate_plane(planeDT, delta) {
    planeDT.forEach(planesDT => {
        let plane = planesDT.group
        plane.position.set(0, 0, 0);
        plane.rotation.set(0, 0, 0);
        plane.updateMatrixWorld();
        planesDT.rot += delta * 0.29
        // Vector3(x, y, z)

        plane.rotateOnAxis(planesDT.randomAxis, planesDT.randomAxisRot)
        plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planesDT.rot)
        plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planesDT.rad)
        plane.translateY(planesDT.yoff)
        plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), +Math.PI * 0.5)
    })
    return planeDT
}

function set_bg(sphere, sunlight, moonlight, type) {
    if (animating) return
    let anim
    if (type == true) {
        anim = [1, 0]
    } else if (type == false) {
        anim = [0, 1]
    }

    let obj = {t: 0}
    animating = true
    anime({
        targets: obj,
        t: anim,
        complete: () => {
            animating = false,
            day = !day
        },
        update: () => {
            sunlight.intensity = 3.5 * (1 - obj.t)
            moonlight.intensity = 3.5 * obj.t
            sunlight.position.setY(20 * (1 - obj.t))
            moonlight.position.setY(20 * obj.t)
            sphere.material.sheen = (1 - obj.t)
            sunbg.style.opacity = 1 - obj.t,
            mounbg.style.opacity = obj.t
        },
        easing : 'easeInOutSine',
        duration : 500
    })
}

function listen(sphere, sunlight, moonlight) {
    window.addEventListener('mousemove', (e) => {
        if (e.clientX > (innerWidth - 100) && !day) {
            set_bg(sphere, sunlight, moonlight, true)
        } else if (e.clientX < 100 && day === true) {
            set_bg(sphere, sunlight, moonlight, false)
        }
    })
}

async function animation() {
    let clock = new THREE.Clock()
    let moonlight = set_moonlight()
    let sunlight = set_sunlight()
    let control = set_control()
    let texture = await get_texture()
    let envmap = await set_envmap()
    let sphere = add_sphere(texture, envmap)
    if (day === false) {
        set_bg(sphere, sunlight, moonlight, day)
        day = true
    }
    let planeDT = await set_plane(texture, envmap)
    listen(sphere, sunlight, moonlight)
    renderer.setAnimationLoop(() => {
        let delta = clock.getDelta()
        sphere.rotation.y += -0.002
        planeDT = animate_plane(planeDT, delta)
        control.update()
        renderer.render(scene, camera)
        renderer.autoClear = true
    })
}
animation()