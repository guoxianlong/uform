import { useMemo, useEffect, useRef, useContext } from 'react'
import { each } from '@uform/shared'
import { IVirtualFieldStateProps, IVirtualFieldState, IForm } from '@uform/core'
import { useDirty } from './useDirty'
import { useForceUpdate } from './useForceUpdate'
import { IVirtualFieldHook } from '../types'
import FormContext from '../context'

export const useVirtualField = (
  options: IVirtualFieldStateProps
): IVirtualFieldHook => {
  const forceUpdate = useForceUpdate()
  const dirty = useDirty(options, ['props'])
  const ref = useRef<any>({
    field: null,
    unmounted: false
  })
  const form = useContext<IForm>(FormContext)
  if (!form) {
    throw new Error('Form object cannot be found from context.')
  }
  useMemo(() => {
    let initialized = false
    ref.current.field = form.registerVirtualField(options)
    ref.current.field.subscribe(() => {
      if (ref.current.unmounted) return
      /**
       * 同步Field状态只需要forceUpdate一下触发重新渲染，因为字段状态全部代理在uform core内部
       */
      if (initialized) {
        forceUpdate()
      }
    })
    initialized = true
  }, [])

  useEffect(() => {
    if (dirty.num > 0) {
      ref.current.field.setState((state: IVirtualFieldState) => {
        each(dirty.dirtys, (result, key) => {
          if (result) {
            state[key] = options[key]
          }
        })
      })
    }
  })

  useEffect(() => {
    ref.current.field.setState(state => {
      state.mounted = true
    }, !ref.current.field.state.unmounted) //must notify,need to trigger restore value
    ref.current.unmounted = false
    return () => {
      ref.current.unmounted = true
      ref.current.field.unsubscribe()
      ref.current.field.setState((state: IVirtualFieldState) => {
        state.unmounted = true
      }) //must notify,need to trigger remove value
    }
  }, [])

  const state = ref.current.field.getState()
  return {
    state,
    field: ref.current.field,
    form,
    props: state.props
  }
}

export default useVirtualField
